/**
 * 相册编辑模式 island（client:idle，常驻挂载但仅在 ?edit=1 时渲染界面）：
 * - 以「景点组」为单位编辑：组内拖拽排单张顺序；组头拖拽整体换景点次序；
 *   单张可「移入相邻组」（跨组移动 = 该照片改属于那个景点，随保存写入 scenes.json）；
 * - 每张可标记隐藏（不上站）、任一张可设为封面；
 * - 保存回路二选一：GitHub Contents API 直推仓库（token 存浏览器本地）或导出文件；
 * - 保存时提交 order.json（线性顺序 + hidden + cover）；若组间有移动则同步重写 scenes.json；
 * - 访客（无 ?edit=1）零渲染零请求；token 仅存 localStorage、只建议授予单仓库 Contents 读写。
 */
import { useMemo, useRef, useState } from 'react';

export interface EditPhoto {
  /** 文件名，如 047.jpg（order.json / scenes.json 的键） */
  name: string;
  /** 640w 缩略图 URL */
  thumb: string;
  /** 所属子景点（build-photos 从 scenes.json 写入 travels.json）；null = 无分组结构 */
  scene: string | null;
}

interface Props {
  albumId: string;
  photos: EditPhoto[];
  /** 当前封面文件名 */
  coverName: string;
}

interface Item {
  name: string;
  thumb: string;
  hidden: boolean;
}
interface Group {
  scene: string | null;
  items: Item[];
}

const REPO = 'lii-lii321/lii-lii321.github.io';
const TOKEN_KEY = 'gh-edit-token';

/** 按连续区段初始化分组（与展示端 groupByScene 同语义） */
function initGroups(photos: EditPhoto[]): Group[] {
  const groups: Group[] = [];
  for (const p of photos) {
    const last = groups[groups.length - 1];
    if (last && last.scene === p.scene) last.items.push({ name: p.name, thumb: p.thumb, hidden: false });
    else groups.push({ scene: p.scene, items: [{ name: p.name, thumb: p.thumb, hidden: false }] });
  }
  return groups;
}

export default function EditGrid({ albumId, photos, coverName }: Props) {
  const editing = useMemo(
    () => typeof location !== 'undefined' && location.search.includes('edit=1'),
    [],
  );
  const [groups, setGroups] = useState(() => initGroups(photos));
  const [cover, setCover] = useState(coverName);
  const [drag, setDrag] = useState<{ gi: number; idx: number } | null>(null);
  const [groupDrag, setGroupDrag] = useState<number | null>(null);
  /** 插入位置指示：拖动悬停在哪张的前/后（gi=-1 表示无有效目标） */
  const [dropHint, setDropHint] = useState<{ gi: number; idx: number } | null>(null);
  const [token, setToken] = useState(() =>
    typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) ?? '' : '',
  );
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const sceneDirtyRef = useRef(false);

  if (!editing) return null;

  const lineOrder = () => groups.flatMap((g) => g.items.map((i) => i.name));
  const hiddenList = () => groups.flatMap((g) => g.items.filter((i) => i.hidden).map((i) => i.name));
  /** 组间发生移动后，从当前分组重建 scenes.json 全量映射（null 的照片不入映射） */
  const scenesFromGroups = () => {
    const map: Record<string, string> = {};
    for (const g of groups) {
      if (g.scene === null) continue;
      for (const i of g.items) map[i.name] = g.scene;
    }
    return map;
  };

  const markDirty = () => setStatus('有未保存的修改');

  /** 悬停时计算插入位置：鼠标在格子左半 → 插它前面，右半 → 插它后面 */
  const hoverInGroup = (gi: number, idx: number, clientX: number, el: HTMLElement) => {
    if (!drag || drag.gi !== gi) {
      setDropHint(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    const before = clientX < rect.left + rect.width / 2;
    const insertAt = before ? idx : idx + 1;
    // 拖到自己紧邻的位置（原位）不显示指示
    if (insertAt === drag.idx || insertAt === drag.idx + 1) {
      setDropHint(null);
      return;
    }
    setDropHint({ gi, idx: insertAt });
  };

  /** 按指示位置落子插入 */
  const dropInGroup = (gi: number) => {
    if (!drag) return;
    const hint = dropHint;
    setDropHint(null);
    if (!hint || hint.gi !== gi) return;
    setGroups((gs) => {
      const next = gs.map((g) => ({ ...g, items: [...g.items] }));
      const [moved] = next[gi].items.splice(drag.idx, 1);
      let target = hint.idx;
      if (drag.idx < hint.idx) target -= 1;
      next[gi].items.splice(Math.max(0, target), 0, moved);
      return next;
    });
    setDrag(null);
    setStatus('有未保存的修改');
  };

  /** 跨组移动单张（dir = -1 上一组 / +1 下一组）：照片改属于目标组 */
  const moveToGroup = (gi: number, idx: number, dir: -1 | 1) => {
    const target = gi + dir;
    if (target < 0 || target >= groups.length) return;
    setGroups((gs) => {
      const safe = Math.min(idx, gs[gi].items.length - 1); // 防陈旧索引越界
      const next = gs.map((g) => ({ ...g, items: [...g.items] }));
      const [moved] = next[gi].items.splice(safe, 1);
      if (!moved) return gs; // 守卫：取不到就原样返回，绝不丢图
      if (next[gi].items.length === 0) next.splice(gi, 1); // 组空则移除，scene 随最后一张走
      next[Math.min(target, next.length)].items.push(moved);
      return next;
    });
    sceneDirtyRef.current = true;
    setStatus('有未保存的修改（含景点归属变更）');
  };

  /** 完整性守卫：任何操作丢图时，保存/导出前把缺失的照片自动补回第一组（数据永不丢失） */
  const repairIntegrity = (gs: Group[]): Group[] => {
    const present = new Set(gs.flatMap((g) => g.items.map((i) => i.name)));
    const missing = photos.filter((p) => !present.has(p.name));
    if (missing.length === 0) return gs;
    const next = gs.length > 0 ? gs.map((g) => ({ ...g, items: [...g.items] })) : [{ scene: photos[0]?.scene ?? null, items: [] }];
    for (const p of missing) next[0].items.push({ name: p.name, thumb: p.thumb, hidden: false });
    setStatus(`检测到 ${missing.length} 张照片被意外移出清单，已自动补回——请检查它们的位置`);
    return next;
  };

  /** 整组换序 */
  const dropGroupBefore = (targetGi: number) => {
    if (groupDrag === null || groupDrag === targetGi) return;
    setGroups((gs) => {
      const next = [...gs];
      const [moved] = next.splice(groupDrag, 1);
      let t = targetGi;
      if (groupDrag < targetGi) t -= 1;
      next.splice(Math.max(0, t), 0, moved);
      return next;
    });
    setGroupDrag(null);
    setStatus('有未保存的修改');
  };

  const toggleHidden = (gi: number, idx: number) => {
    setGroups((gs) =>
      gs.map((g, i) =>
        i === gi ? { ...g, items: g.items.map((it, j) => (j === idx ? { ...it, hidden: !it.hidden } : it)) } : g,
      ),
    );
    setStatus('有未保存的修改');
  };

  const makeCover = (gi: number, idx: number) => {
    setCover(groups[gi].items[idx].name);
    setStatus('有未保存的修改');
  };

  const exportJson = () => {
    setGroups((gs) => {
      const safe = repairIntegrity(gs);
      const payload = { order: safe.flatMap((g) => g.items.map((i) => i.name)), hidden: safe.flatMap((g) => g.items.filter((i) => i.hidden).map((i) => i.name)), cover };
      const blob = new Blob([JSON.stringify(payload, null, 2) + '\n'], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'order.json';
      a.click();
      URL.revokeObjectURL(a.href);
      if (sceneDirtyRef.current) {
        const map: Record<string, string> = {};
        for (const g of safe) {
          if (g.scene === null) continue;
          for (const i of g.items) map[i.name] = g.scene;
        }
        const sb = new Blob([JSON.stringify(map, null, 2) + '\n'], { type: 'application/json' });
        const b = document.createElement('a');
        b.href = URL.createObjectURL(sb);
        b.download = 'scenes.json';
        b.click();
        URL.revokeObjectURL(b.href);
        setStatus('order.json 与 scenes.json 已导出——两个文件都发给我即可落库上线');
      } else {
        setStatus('order.json 已导出——发给助手即可落库上线');
      }
      return safe;
    });
  };

  /** GitHub Contents API 提交一个文件（自动取 SHA 更新既有文件） */
  const putFile = async (t: string, path: string, content: string) => {
    const apiPath = `https://api.github.com/repos/${REPO}/contents/${path}`;
    const head = await fetch(apiPath, {
      headers: { Authorization: `Bearer ${t}`, Accept: 'application/vnd.github+json' },
    });
    let sha: string | undefined;
    if (head.ok) sha = ((await head.json()) as { sha?: string }).sha;
    const res = await fetch(apiPath, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${t}`, Accept: 'application/vnd.github+json' },
      body: JSON.stringify({
        message: `编辑模式：调整 ${albumId}（${path.split('/').pop()}）`,
        content: btoa(unescape(encodeURIComponent(content))),
        ...(sha ? { sha } : {}),
      }),
    });
    return res.ok;
  };

  const saveToGithub = async () => {
    const tok = token.trim();
    if (!tok) {
      setStatus('请先在下方填入 GitHub token');
      return;
    }
    setSaving(true);
    // 完整性守卫：先把丢图补回再序列化（守卫后的 safe 是提交的唯一来源）
    const safe = repairIntegrity(groups);
    setGroups(safe);
    const orderPayload = {
      order: safe.flatMap((g) => g.items.map((i) => i.name)),
      hidden: safe.flatMap((g) => g.items.filter((i) => i.hidden).map((i) => i.name)),
      cover,
    };
    const map: Record<string, string> = {};
    for (const g of safe) {
      if (g.scene === null) continue;
      for (const i of g.items) map[i.name] = g.scene;
    }
    setStatus('正在提交到 GitHub…');
    try {
      const okOrder = await putFile(tok, `photos/${albumId}/order.json`, JSON.stringify(orderPayload, null, 2) + '\n');
      const okScenes = await putFile(tok, `photos/${albumId}/scenes.json`, JSON.stringify(map, null, 2) + '\n');
      if (okOrder && okScenes) {
        sceneDirtyRef.current = false;
        setStatus('已提交！GitHub Actions 构建中，约 5 分钟后线上生效');
      } else {
        setStatus('提交失败：HTTP 错误（token 无效为 401/403——检查权限或重新生成）');
      }
    } catch {
      setStatus('网络错误，稍后再试');
    }
    setSaving(false);
  };

  return (
    <div className="mt-8 rounded-[10px] border border-accent/40 bg-accent-soft p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-sm font-semibold text-accent">编辑模式 · {albumId}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportJson}
            className="cursor-pointer rounded-full border border-rule-2 bg-paper px-3 py-1.5 font-mono text-[11px] text-ink-2 hover:border-accent hover:text-accent"
          >
            导出文件
          </button>
          <button
            type="button"
            onClick={saveToGithub}
            disabled={saving}
            className="cursor-pointer rounded-full bg-ink px-4 py-1.5 font-mono text-[11px] font-semibold text-paper hover:bg-accent disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? '提交中…' : '保存并上线'}
          </button>
        </div>
      </div>
      <p className="meta mt-2 normal-case">
        组内拖动排序 · 拖动景点名整组换序 · 每张的 ▲/▼ 移到相邻景点（会更新归属）· ★ 设封面（当前：{cover}）· ✕ 隐藏
        {status && <span className="ml-2 font-semibold text-accent">{status}</span>}
      </p>

      <div className="mt-4 space-y-6">
        {groups.map((g, gi) => (
          <div
            key={`${g.scene ?? 'none'}-${gi}`}
            className="rounded-[8px] border border-rule bg-paper p-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dropGroupBefore(gi)}
          >
            <div
              draggable
              onDragStart={() => setGroupDrag(gi)}
              onDragEnd={() => setGroupDrag(null)}
              className="mb-3 flex cursor-grab items-center justify-between border-b border-rule pb-2 active:cursor-grabbing"
              title="拖动整组换景点顺序"
            >
              <h3 className="font-serif text-lg font-semibold text-ink">{g.scene ?? albumTitle(gi)}</h3>
              <p className="meta">{g.items.length} 张 · {g.scene ? '拖我换序' : '未分组'}</p>
            </div>
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
              {g.items.map((it, idx) => {
                const hintBefore = dropHint?.gi === gi && dropHint?.idx === idx;
                const hintAfter = dropHint?.gi === gi && dropHint?.idx === idx + 1;
                return (
                <li
                  key={it.name}
                  draggable
                  onDragStart={(e) => {
                    setDrag({ gi, idx });
                    // 拖动浮层：以缩略图本体居中跟随（比浏览器默认快照更清晰）
                    const img = e.currentTarget.querySelector('img');
                    if (img) e.dataTransfer.setDragImage(img, img.clientWidth / 2, img.clientHeight / 2);
                  }}
                  onDragEnd={() => setDropHint(null)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    hoverInGroup(gi, idx, e.clientX, e.currentTarget as HTMLElement);
                  }}
                  onDrop={(e) => {
                    e.stopPropagation();
                    dropInGroup(gi);
                  }}
                  className={`relative cursor-grab overflow-visible rounded-[4px] border bg-paper-2 active:cursor-grabbing ${
                    it.name === cover ? 'border-accent' : it.hidden ? 'border-rule-2 opacity-40' : 'border-rule'
                  }`}
                >
                  {/* 插入位置指示线：悬停格子左/右缘的 accent 竖条 */}
                  {hintBefore && <span aria-hidden="true" className="absolute -left-1.5 top-0 h-full w-[3px] rounded bg-accent" />}
                  {hintAfter && <span aria-hidden="true" className="absolute -right-1.5 top-0 h-full w-[3px] rounded bg-accent" />}
                  <div className="overflow-hidden rounded-[4px]">
                  <img src={it.thumb} alt="" width={160} height={120} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" />
                  </div>
                  <span className="absolute left-1 top-1 rounded bg-black/60 px-1 font-mono text-[10px] text-white">
                    {groups.slice(0, gi).reduce((a, x) => a + x.items.length, 0) + idx + 1}
                  </span>
                  {it.name === cover && (
                    <span className="absolute right-1 top-1 rounded bg-accent px-1 font-mono text-[10px] text-white">封面</span>
                  )}
                  <div className="flex text-center">
                    <button type="button" onClick={() => moveToGroup(gi, idx, -1)} disabled={gi === 0} className="flex-1 cursor-pointer bg-paper py-1 text-[11px] text-ink-3 hover:text-accent disabled:opacity-30" title="移到上一景点">
                      ▲
                    </button>
                    <button type="button" onClick={() => makeCover(gi, idx)} className="flex-1 cursor-pointer border-x border-rule bg-paper py-1 text-[11px] text-ink-3 hover:text-accent" title="设为封面">
                      ★
                    </button>
                    <button type="button" onClick={() => moveToGroup(gi, idx, 1)} disabled={gi === groups.length - 1} className="flex-1 cursor-pointer bg-paper py-1 text-[11px] text-ink-3 hover:text-accent disabled:opacity-30" title="移到下一景点">
                      ▼
                    </button>
                    <button type="button" onClick={() => toggleHidden(gi, idx)} className="flex-1 cursor-pointer border-l border-rule bg-paper py-1 text-[11px] text-ink-3 hover:text-accent" title={it.hidden ? '恢复显示' : '隐藏（不上站）'}>
                      {it.hidden ? '↩' : '✕'}
                    </button>
                  </div>
                </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <details className="mt-4">
        <summary className="meta cursor-pointer normal-case">GitHub token 设置（首次使用填一次，仅存本浏览器）</summary>
        <input
          type="password"
          value={token}
          onChange={(e) => {
            setToken(e.target.value);
            localStorage.setItem(TOKEN_KEY, e.target.value);
          }}
          placeholder="Fine-grained token：仅授权本仓库 Contents 读写"
          className="mt-2 w-full rounded-[4px] border border-rule bg-paper px-3 py-2 font-mono text-xs text-ink outline-none focus:border-accent"
        />
        <p className="meta mt-1 normal-case">
          生成：GitHub → Settings → Developer settings → Fine-grained tokens → 只选本仓库 + Contents 读写
        </p>
      </details>
    </div>
  );
}

/** 无分组照片的组标题兜底（按序号命名，避免空标题） */
function albumTitle(gi: number): string {
  return `未分组 ${gi + 1}`;
}
