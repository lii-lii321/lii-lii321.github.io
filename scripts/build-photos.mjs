/**
 * 照片数据管线（幂等，可反复运行）：
 * 1. 扫描 photos/<相册id>/album.json 相册描述；
 * 2. 用 exifr 读取每张照片的 EXIF（拍摄时间 / 相机型号 / GPS），缺失时对应字段为 null；
 * 3. 用 sharp 生成 640 宽 WebP 缩略图与 16 宽模糊 base64 占位图；
 * 4. 原图与缩略图复制到 public/photos/<id>/；
 * 5. 聚合生成 src/data/travels.json（国家/省份去重计数 + 照片总数）。
 *
 * 用法：node scripts/build-photos.mjs（npm run build 的第一步会自动执行）
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import exifr from 'exifr';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const PHOTOS_SRC_DIR = path.join(projectRoot, 'photos');
const PUBLIC_PHOTOS_DIR = path.join(projectRoot, 'public', 'photos');
const TRAVELS_JSON_PATH = path.join(projectRoot, 'src', 'data', 'travels.json');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const THUMB_WIDTH = 640;
const BLUR_WIDTH = 16;

/** 读取并校验 album.json 的必要字段 */
async function readAlbumConfig(albumDir, albumId) {
  const raw = await fs.readFile(path.join(albumDir, 'album.json'), 'utf-8');
  const cfg = JSON.parse(raw);
  for (const key of ['title', 'date', 'tags', 'description', 'place', 'cover']) {
    if (cfg[key] === undefined) throw new Error(`相册 ${albumId} 的 album.json 缺少字段：${key}`);
  }
  for (const key of ['name', 'country', 'lng', 'lat']) {
    if (cfg.place[key] === undefined) throw new Error(`相册 ${albumId} 的 album.json 缺少 place.${key}`);
  }
  return cfg;
}

/** 列出相册目录下的图片文件（按文件名排序，保证输出稳定） */
async function listImages(albumDir) {
  const entries = await fs.readdir(albumDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort();
}

/** 解析单张照片的 EXIF；示例图通常没有 EXIF，对应字段返回 null */
async function readExif(buffer) {
  try {
    const meta = await exifr.parse(buffer, { tiff: true, ifd0: true, exif: true, gps: true });
    if (!meta) return { takenAt: null, camera: null, gps: null };
    const date = meta.DateTimeOriginal;
    const takenAt =
      date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
    const camera =
      typeof meta.Model === 'string' && meta.Model.trim() !== '' ? meta.Model.trim() : null;
    const gps =
      typeof meta.latitude === 'number' && typeof meta.longitude === 'number'
        ? { lng: Number(meta.longitude.toFixed(6)), lat: Number(meta.latitude.toFixed(6)) }
        : null;
    return { takenAt, camera, gps };
  } catch {
    // EXIF 解析失败不中断管线，按“无 EXIF”处理
    return { takenAt: null, camera: null, gps: null };
  }
}

async function main() {
  console.log('[照片管线] 开始：扫描 photos/ 目录 ...');

  let albumIds;
  try {
    const entries = await fs.readdir(PHOTOS_SRC_DIR, { withFileTypes: true });
    albumIds = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    throw new Error(`未找到照片源目录：${PHOTOS_SRC_DIR}`);
  }

  const albumDirs = [];
  for (const id of albumIds) {
    const dir = path.join(PHOTOS_SRC_DIR, id);
    try {
      await fs.access(path.join(dir, 'album.json'));
      albumDirs.push({ id, dir });
    } catch {
      console.log(`[照片管线] 跳过目录 ${id}：缺少 album.json`);
    }
  }
  if (albumDirs.length === 0) {
    throw new Error('photos/ 下没有可用相册（需要至少一个包含 album.json 的子目录）');
  }
  console.log(`[照片管线] 发现 ${albumDirs.length} 个相册：${albumDirs.map((a) => a.id).join('、')}`);

  // 幂等：public/photos 完全由本脚本生成，先清空再重建
  await fs.rm(PUBLIC_PHOTOS_DIR, { recursive: true, force: true });
  await fs.mkdir(PUBLIC_PHOTOS_DIR, { recursive: true });

  const trips = [];

  for (let i = 0; i < albumDirs.length; i++) {
    const { id, dir } = albumDirs[i];
    const cfg = await readAlbumConfig(dir, id);
    const files = await listImages(dir);

    // 防御：缩略图名只取 basename（01.jpg / 01.png 都会写到 thumbs/01.webp），
    // 同相册内同名不同扩展的图片会互相覆盖，直接报错让作者重命名
    const seenBases = new Set();
    for (const fileName of files) {
      const base = path.basename(fileName, path.extname(fileName)).toLowerCase();
      if (seenBases.has(base)) {
        throw new Error(
          `相册 ${id} 存在同名不同扩展的图片（"${fileName}" 与已有文件冲突），缩略图会互相覆盖，请重命名`,
        );
      }
      seenBases.add(base);
    }

    console.log(`[照片管线] [${i + 1}/${albumDirs.length}] 相册 ${id}《${cfg.title}》：${files.length} 张照片`);

    const outAlbumDir = path.join(PUBLIC_PHOTOS_DIR, id);
    const outThumbDir = path.join(outAlbumDir, 'thumbs');
    await fs.mkdir(outThumbDir, { recursive: true });

    const photos = [];
    // 子景点清单（gen-scenes.mjs 生成，可选）：NN.jpg → 子景点名
    let sceneMap = null;
    try {
      sceneMap = JSON.parse(await fs.readFile(path.join(dir, 'scenes.json'), 'utf-8'));
    } catch {
      sceneMap = null; // 没有子景点结构的相册（或未生成清单）→ 全部 photo.scene 为 null
    }
    for (const fileName of files) {
      const srcPath = path.join(dir, fileName);
      const buffer = await fs.readFile(srcPath);

      const rawMeta = await sharp(buffer).metadata();
      // orientation 5–8：存储像素旋转了 90°，记录真实宽高需交换（缩略图链路会先转正）
      const swapped = (rawMeta.orientation ?? 1) >= 5;
      const width = (swapped ? rawMeta.height : rawMeta.width) ?? 0;
      const height = (swapped ? rawMeta.width : rawMeta.height) ?? 0;

      // EXIF：拍摄时间 / 相机 / GPS（缺失为 null）
      const { takenAt, camera, gps } = await readExif(buffer);

      // 缩略图：640 宽 WebP（rotate() 按 EXIF 自动转正；WebP 不带 EXIF，必须物理转正）
      const thumbBase = `${path.basename(fileName, path.extname(fileName))}.webp`;
      await sharp(buffer)
        .rotate()
        .resize({ width: THUMB_WIDTH })
        .webp({ quality: 80 })
        .toFile(path.join(outThumbDir, thumbBase));

      // 模糊占位：16 宽 WebP，base64 data URI
      const blurBuffer = await sharp(buffer).rotate().resize({ width: BLUR_WIDTH }).webp({ quality: 40 }).toBuffer();
      const blur = `data:image/webp;base64,${blurBuffer.toString('base64')}`;

      // 原图复制到 public
      await fs.copyFile(srcPath, path.join(outAlbumDir, fileName));

      photos.push({
        src: `/photos/${id}/${fileName}`,
        thumb: `/photos/${id}/thumbs/${thumbBase}`,
        blur,
        width,
        height,
        takenAt,
        camera,
        gps,
        scene: (sceneMap && sceneMap[fileName]) || null,
      });
      const exifInfo = takenAt || camera || gps ? '已读取 EXIF' : '无 EXIF（takenAt/camera/gps 为 null）';
      console.log(`  - ${fileName}：缩略图 OK · 模糊占位 OK · ${exifInfo}`);
    }

    if (photos.length === 0) {
      throw new Error(`相册 ${id} 没有任何图片文件`);
    }

    // cover 必须是相册内真实存在的图片；否则回退到第一张并警告
    const coverName = files.includes(cfg.cover) ? cfg.cover : files[0];
    if (!files.includes(cfg.cover)) {
      console.log(`  ! 警告：cover "${cfg.cover}" 不存在，已回退为 ${coverName}`);
    }

    trips.push({
      id,
      title: cfg.title,
      date: cfg.date,
      tags: cfg.tags,
      description: cfg.description,
      place: {
        name: cfg.place.name,
        country: cfg.place.country,
        province: cfg.place.province ?? null,
        lng: cfg.place.lng,
        lat: cfg.place.lat,
      },
      cover: `/photos/${id}/${coverName}`,
      photos,
    });
  }

  // 统计聚合：国家 / 省份去重计数 + 照片总数
  const stats = {
    countries: new Set(trips.map((t) => t.place.country)).size,
    provinces: new Set(
      trips.filter((t) => t.place.province != null).map((t) => t.place.province),
    ).size,
    photoCount: trips.reduce((sum, t) => sum + t.photos.length, 0),
  };

  await fs.mkdir(path.dirname(TRAVELS_JSON_PATH), { recursive: true });
  await fs.writeFile(TRAVELS_JSON_PATH, JSON.stringify({ stats, trips }, null, 2) + '\n', 'utf-8');

  console.log(`[照片管线] 统计：国家 ${stats.countries} · 省份 ${stats.provinces} · 照片 ${stats.photoCount} 张`);
  console.log('[照片管线] 完成：缩略图与占位图已生成到 public/photos/，travels.json 已写入 src/data/');
}

main().catch((err) => {
  console.error(`[照片管线] 失败：${err.message}`);
  process.exit(1);
});
