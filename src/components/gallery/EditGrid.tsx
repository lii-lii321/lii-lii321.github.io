/**
 * 相册编辑模式 island（client:idle，常驻挂载但仅在 ?edit=1 时渲染界面）：
 * - 网格缩略图拖拽排序、标记隐藏（不上站）、设为封面；
 * - 保存回路二选一：GitHub Contents API 直推仓库（token 存浏览器本地）或导出 order.json 文件；
 * - order.json 由 build-photos 读取：order 重排、hidden 排除、cover 覆盖封面；
 * - 访客（无 ?edit=1）零渲染零请求；token 仅存 localStorage、只建议授予单仓库 Contents 读写。
 */
import { useMemo, useRef, useState } from 'react';

export interface EditPhoto {
  /** 文件名，如 047.jpg（order.json 的键） */
  name: string;
  /** 640w 缩略图 URL */
  thumb: string;
}

interface Props {
  albumId: string;
  photos: EditPhoto[];
  /** 当前封面文件名 */
  coverName: string;
}

const REPO = 'lii-lii321/lii-lii321.github.io';
const TOKEN_KEY = 'gh-edit-token';

export default function EditGrid({ albumId, photos, coverName }: Props) {
  const editing = useMemo(
    () => typeof location !== 'undefined' && location.search.includes('edit=1'),
    [],
  );
  const [items, setItems] = useState(() => photos.map((p) => ({ ...p, hidden: false })));
  const [cover, setCover] = useState(coverName);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [token, setToken] = useState(() =>
    typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) ?? '' : '',
  );
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const dirtyRef = useRef(false);

  if (!editing) return null;

  const orderPayload = () => ({
    order: items.filter((i) => !i.hidden).map((i) => i.name),
    hidden: items.filter((i) => i.hidden).map((i) => i.name),
    cover,
  });

  const markDirty = () => {
    dirtyRef.current = true;
    setStatus('有未保存的修改');
  };

  const onDrop = (to: number) => {
    if (dragIndex === null || dragIndex === to) return;
    setItems((list) => {
      const next = [...list];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDragIndex(null);
    markDirty();
  };

  const toggleHidden = (idx: number) => {
    setItems((list) => list.map((it, i) => (i === idx ? { ...it, hidden: !it.hidden } : it)));
    markDirty();
  };

  const makeCover = (idx: number) => {
    setCover(items[idx].name);
    markDirty();
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(orderPayload(), null, 2) + '\n'], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'order.json';
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus('order.json 已导出——发给助手即可落库上线');
  };

  const saveToGithub = async () => {
    const t = token.trim();
    if (!t) {
      setStatus('请先在下方填入 GitHub token');
      return;
    }
    setSaving(true);
    setStatus('正在提交到 GitHub…');
    try {
      const apiPath = `https://api.github.com/repos/${REPO}/contents/photos/${albumId}/order.json`;
      const head = await fetch(apiPath, {
        headers: { Authorization: `Bearer ${t}`, Accept: 'application/vnd.github+json' },
      });
      let sha: string | undefined;
      if (head.ok) sha = ((await head.json()) as { sha?: string }).sha;
      const res = await fetch(apiPath, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${t}`, Accept: 'application/vnd.github+json' },
        body: JSON.stringify({
          message: `编辑模式：调整 ${albumId} 相册顺序（网页编辑）`,
          content: btoa(unescape(encodeURIComponent(JSON.stringify(orderPayload(), null, 2) + '\n'))),
          ...(sha ? { sha } : {}),
        }),
      });
      if (res.ok) {
        dirtyRef.current = false;
        setStatus('已提交！GitHub Actions 构建中，约 5 分钟后线上生效');
      } else if (res.status === 401 || res.status === 403) {
        setStatus('token 无效或权限不足（需要该仓库的 Contents 读写）');
      } else {
        setStatus(`提交失败：HTTP ${res.status}`);
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
            导出 JSON
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
        拖动缩略图调序 · 点 ✕ 隐藏（不上站）· 点 ★ 设为封面（当前：{cover}）
        {status && <span className="ml-2 text-accent">{status}</span>}
      </p>

      <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
        {items.map((it, idx) => (
          <li
            key={it.name}
            draggable
            onDragStart={() => setDragIndex(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(idx)}
            className={`relative cursor-grab overflow-hidden rounded-[4px] border bg-paper-2 active:cursor-grabbing ${
              it.name === cover ? 'border-accent' : it.hidden ? 'border-rule-2 opacity-40' : 'border-rule'
            }`}
          >
            <img src={it.thumb} alt="" width={160} height={120} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" />
            <span className="absolute left-1 top-1 rounded bg-black/60 px-1 font-mono text-[10px] text-white">{idx + 1}</span>
            {it.name === cover && (
              <span className="absolute right-1 top-1 rounded bg-accent px-1 font-mono text-[10px] text-white">封面</span>
            )}
            <div className="flex">
              <button
                type="button"
                onClick={() => makeCover(idx)}
                className="flex-1 cursor-pointer bg-paper py-1 text-center text-[11px] text-ink-3 hover:text-accent"
                title="设为封面"
              >
                ★
              </button>
              <button
                type="button"
                onClick={() => toggleHidden(idx)}
                className="flex-1 cursor-pointer border-l border-rule bg-paper py-1 text-center text-[11px] text-ink-3 hover:text-accent"
                title={it.hidden ? '恢复显示' : '隐藏（不上站）'}
              >
                {it.hidden ? '↩' : '✕'}
              </button>
            </div>
          </li>
        ))}
      </ul>

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
