/**
 * 相册灯箱（React island，client:load）：
 * - 打开：点击静态网格项后，由 PhotoGrid 派发 gallery:open 自定义事件驱动；
 * - 切换：← / → 方向键或屏幕左右按钮，循环播放；
 * - 关闭：Esc、右上角按钮或点击空白遮罩；
 * - 只在灯箱内加载显示档（full：与原图同宽的 WebP 重编码，实测平均减重约 27%；
 *   字段缺失时回退原图 src），并预加载相邻两张显示档；
 * - 照片有 EXIF（takenAt / camera）时展示，没有则整行隐藏；
 * - 打开期间锁定 body 滚动，blur 占位图作为原图加载时的背景；
 * - 缩放：双击（桌面）/ 双击轻点（移动端）1 ↔ 2.4 倍切换、双指捏合 1–4 倍、
 *   拖拽平移（放大态），切换照片或收起时自动复位；
 * - 打开时焦点移入对话框、Tab 焦点圈闭在对话框内、关闭时归还给触发元素。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent, TouchEvent } from 'react';

/** PhotoGrid 派发的打开事件名（保持与 PhotoGrid.astro 中一致） */
const OPEN_EVENT = 'gallery:open';

interface OpenEventDetail {
  index: number;
}

/** 灯箱消费的照片字段子集：island props 会被整体序列化进 HTML，
 *  调用处只传这六个字段（width/height/thumb2x/gps 不进灯箱，别带上） */
interface LightboxPhoto {
  /** 原图 URL（full 缺失时的回退） */
  src: string;
  /** 显示档 URL：与原图同宽的 WebP 重编码（构建时生成）；缺失时灯箱退回 src */
  full?: string;
  /** 16 宽 WebP 模糊占位 data URI（原图加载期间的背景） */
  blur: string;
  takenAt: string | null;
  camera: string | null;
  scene: string | null;
}

interface Props {
  photos: LightboxPhoto[];
  albumTitle: string;
}

/** 灯箱 <img> 实际加载的档位：显示档优先，缺失回退原图 */
const displaySrc = (photo: LightboxPhoto) => photo.full ?? photo.src;

/** ISO 时间串 → “2025 年 4 月 12 日 08:30”；解析失败时原样返回。
 *  takenAt 是拍摄地「墙钟时间」按 UTC 序列化的（约定见 build-photos.mjs），
 *  展示必须用 getUTC*，否则访客本地时区会整体偏移、晚间照片跨天 */
function formatTakenAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()} 年 ${date.getUTCMonth() + 1} 月 ${date.getUTCDate()} 日 ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

export default function Lightbox({ photos, albumTitle }: Props) {
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  /** 触屏滑动起点（null = 未在滑动）；移动端左右滑切换，阈值 48px */
  const touchStartX = useRef<number | null>(null);
  const count = photos.length;

  /* 缩放态：双击/双击轻点切换、捏合缩放、放大态拖拽平移；切图或收起自动复位 */
  const [zoom, setZoom] = useState(1);
  const [origin, setOrigin] = useState('center');
  const [pan, setPan] = useState({ x: 0, y: 0 });
  /** 手势进行中（捏合/拖拽）：禁用 transform 过渡，松手恢复 */
  const [dragging, setDragging] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  /** 双指捏合起点（两指距离 + 起始倍率） */
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null);
  /** 单指/鼠标拖拽的抓取点（相对当前 pan 的偏移） */
  const panDragRef = useRef<{ x: number; y: number } | null>(null);
  /** 双击轻点判定：上一次轻触的时间与位置 */
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

  const close = useCallback(() => setIndex(null), []);

  /** 复位缩放：倍率、缩放中心、平移量 */
  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setOrigin('center');
    setDragging(false);
  }, []);

  const step = useCallback(
    (delta: number) => {
      resetZoom();
      setIndex((current) => {
        if (current === null || count === 0) return current;
        return (current + delta + count) % count;
      });
    },
    [count, resetZoom],
  );

  // 监听静态网格派发的打开事件（带越界钳制）
  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<OpenEventDetail>).detail;
      if (!detail || !Number.isInteger(detail.index) || count === 0) return;
      resetZoom();
      setIndex(Math.max(0, Math.min(detail.index, count - 1)));
    };
    document.addEventListener(OPEN_EVENT, onOpen);
    return () => document.removeEventListener(OPEN_EVENT, onOpen);
  }, [count, resetZoom]);

  /** 双击 / 双击轻点：1 ↔ 2.4 倍切换；放大时以点击点为缩放中心 */
  const toggleZoomAt = (clientX: number, clientY: number) => {
    if (zoom > 1) {
      resetZoom();
      return;
    }
    const rect = imgRef.current?.getBoundingClientRect();
    if (rect && rect.width > 0) {
      setOrigin(
        `${(((clientX - rect.left) / rect.width) * 100).toFixed(2)}% ${(((clientY - rect.top) / rect.height) * 100).toFixed(2)}%`,
      );
    }
    setZoom(2.4);
  };

  /** 把平移量钳制在图片溢出范围内，避免把照片拖出画面 */
  const clampPan = (p: { x: number; y: number }, z: number) => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return p;
    const mx = ((z - 1) * rect.width) / 2;
    const my = ((z - 1) * rect.height) / 2;
    return {
      x: Math.max(-mx, Math.min(mx, p.x)),
      y: Math.max(-my, Math.min(my, p.y)),
    };
  };

  // 键盘：← / → 切换，Esc 关闭
  useEffect(() => {
    if (index === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      else if (event.key === 'ArrowLeft') step(-1);
      else if (event.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [index, close, step]);

  // 焦点管理（aria-modal 对话框）：打开时把焦点从触发按钮移入对话框，
  // 关闭（或组件卸载）时归还给触发元素，避免焦点停留在遮罩下的网格上
  const isOpen = index !== null;
  useEffect(() => {
    if (!isOpen) return;
    const trigger = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => trigger?.focus?.();
  }, [isOpen]);

  /** Tab 焦点圈闭：Tab / Shift+Tab 循环限制在对话框内的可聚焦元素上 */
  const trapTab = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, [href], [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    const inside = dialogRef.current.contains(active);
    if (event.shiftKey && (active === first || !inside)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !inside)) {
      event.preventDefault();
      first.focus();
    }
  };

  // 灯箱打开期间锁定页面滚动
  useEffect(() => {
    if (index === null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [index]);

  // 预加载相邻两张显示档，让切换更顺滑
  useEffect(() => {
    if (index === null || count < 2) return;
    for (const delta of [-1, 1]) {
      const neighbor = photos[(index + delta + count) % count];
      if (neighbor) {
        const img = new Image();
        img.src = displaySrc(neighbor);
      }
    }
  }, [index, photos, count]);

  if (index === null || count === 0) return null;

  const photo = photos[index];
  const hasExif = photo.takenAt !== null || photo.camera !== null;
  const hasInfo = hasExif || photo.scene !== null;

  const stopPropagation = (event: MouseEvent) => event.stopPropagation();

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="lb-shell fixed inset-0 z-[100] flex flex-col bg-night/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`浏览照片：${albumTitle}`}
      onClick={close}
      onKeyDown={trapTab}
    >
      {/* 顶栏：计数 + EXIF + 关闭按钮 */}
      <div
        className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6"
        onClick={stopPropagation}
      >
        <p className="shrink-0 text-sm font-medium text-white" aria-live="polite">
          第 {index + 1} / {count} 张
        </p>
        {hasInfo && (
          <p className="hidden min-w-0 truncate text-xs text-white/70 md:block">
            {photo.scene && <span className="text-white/90">{photo.scene}</span>}
            {photo.scene && hasExif && <span className="mx-2">·</span>}
            {photo.takenAt && (
              <span>
                <span aria-hidden="true">📅 </span>
                {formatTakenAt(photo.takenAt)}
              </span>
            )}
            {photo.takenAt && photo.camera && <span className="mx-2">·</span>}
            {photo.camera && (
              <span>
                <span aria-hidden="true">📷 </span>
                {photo.camera}
              </span>
            )}
          </p>
        )}
        {/* 原图找回：灯箱默认显示显示档（full），这里给未压缩原图的下载入口（full 缺失时当前显示的就是原图） */}
        <a
          href={photo.src}
          download
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white/85 transition-colors hover:border-white hover:text-white"
        >
          原图 ↗
        </a>
        <button
          type="button"
          onClick={close}
          aria-label="关闭灯箱（Esc）"
          className="shrink-0 cursor-pointer rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white/85 transition-colors hover:border-white hover:text-white"
        >
          ✕ 关闭
        </button>
      </div>

      {/* 图片区：显示档只在灯箱内加载，blur 占位图作为加载背景；
          未缩放时左右滑切换，缩放态（双击/捏合）下单指/鼠标拖拽改为平移 */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-12 sm:px-24"
        style={{ cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : undefined }}
        onTouchStart={(event) => {
          if (event.touches.length === 2) {
            const [a, b] = [event.touches[0], event.touches[1]];
            if (a && b) {
              pinchRef.current = {
                startDist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
                startZoom: zoom,
              };
              touchStartX.current = null;
              lastTapRef.current = null;
            }
            return;
          }
          const t = event.touches[0];
          if (!t) return;
          const now = Date.now();
          const last = lastTapRef.current;
          // 双击轻点（<300ms、位移 <24px）切换缩放——放大/缩小两个方向都支持
          if (last && now - last.time < 300 && Math.hypot(t.clientX - last.x, t.clientY - last.y) < 24) {
            lastTapRef.current = null;
            toggleZoomAt(t.clientX, t.clientY);
            touchStartX.current = null;
            return;
          }
          lastTapRef.current = { time: now, x: t.clientX, y: t.clientY };
          if (zoom > 1) {
            // 缩放态单指 = 平移，不参与滑动切图
            panDragRef.current = { x: t.clientX - pan.x, y: t.clientY - pan.y };
            touchStartX.current = null;
            return;
          }
          touchStartX.current = t.clientX;
        }}
        onTouchMove={(event) => {
          if (event.touches.length === 2 && pinchRef.current) {
            const [a, b] = [event.touches[0], event.touches[1]];
            if (!a || !b) return;
            const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
            const next = Math.min(4, Math.max(1, pinchRef.current.startZoom * (dist / pinchRef.current.startDist)));
            setDragging(true);
            setZoom(next);
            return;
          }
          if (zoom > 1 && panDragRef.current && event.touches.length === 1) {
            const t = event.touches[0];
            if (!t) return;
            setDragging(true);
            setPan(clampPan({ x: t.clientX - panDragRef.current.x, y: t.clientY - panDragRef.current.y }, zoom));
          }
        }}
        onTouchEnd={(event) => {
          const wasPinch = pinchRef.current !== null;
          pinchRef.current = null;
          panDragRef.current = null;
          setDragging(false);
          // 捏合或缩放态不参与滑动切图；捏合回落到 1 附近时整体复位
          if (wasPinch || zoom > 1) {
            touchStartX.current = null;
            if (zoom < 1.05) resetZoom();
            return;
          }
          if (touchStartX.current === null) return;
          const endX = event.changedTouches[0]?.clientX;
          if (endX === undefined) return;
          const dx = endX - touchStartX.current;
          touchStartX.current = null;
          // 阈值以上才算滑动，避免轻点误切；水平滑动不干扰点击空白关闭（click 正常触发）
          if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1);
        }}
        onMouseDown={(event) => {
          if (zoom <= 1) return;
          panDragRef.current = { x: event.clientX - pan.x, y: event.clientY - pan.y };
          setDragging(true);
          event.preventDefault();
        }}
        onMouseMove={(event) => {
          if (zoom > 1 && panDragRef.current) {
            setPan(clampPan({ x: event.clientX - panDragRef.current.x, y: event.clientY - panDragRef.current.y }, zoom));
          }
        }}
        onMouseUp={() => {
          panDragRef.current = null;
          setDragging(false);
        }}
        onMouseLeave={() => {
          panDragRef.current = null;
          setDragging(false);
        }}
      >
        <img
          ref={imgRef}
          key={photo.src}
          src={displaySrc(photo)}
          alt={`${albumTitle} · 第 ${index + 1} 张`}
          className="max-h-full max-w-full rounded-lg object-contain"
          style={{
            backgroundImage: `url("${photo.blur}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transformOrigin: origin,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: dragging ? 'none' : 'transform 0.22s ease',
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            toggleZoomAt(event.clientX, event.clientY);
          }}
          onClick={stopPropagation}
          draggable={false}
        />

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                step(-1);
              }}
              aria-label="上一张（←）"
              className="absolute left-1 top-1/2 -translate-y-1/2 cursor-pointer rounded-full border border-white/20 bg-white/10 px-3 py-4 text-2xl leading-none text-white/85 transition-colors hover:border-white hover:text-white sm:left-4"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                step(1);
              }}
              aria-label="下一张（→）"
              className="absolute right-1 top-1/2 -translate-y-1/2 cursor-pointer rounded-full border border-white/20 bg-white/10 px-3 py-4 text-2xl leading-none text-white/85 transition-colors hover:border-white hover:text-white sm:right-4"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* 底部操作提示 */}
      <p
        className="px-4 py-3 text-center text-xs text-white/50"
        onClick={stopPropagation}
      >
        ← / → 或滑动切换 · 双击缩放 / 捏合缩放 · Esc 或点击空白处关闭
      </p>
    </div>
  );
}
