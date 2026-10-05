/**
 * 相册灯箱（React island，client:load）：
 * - 打开：点击静态网格项后，由 PhotoGrid 派发 gallery:open 自定义事件驱动；
 * - 切换：← / → 方向键或屏幕左右按钮，循环播放；
 * - 关闭：Esc、右上角按钮或点击空白遮罩；
 * - 只在灯箱内加载原图（src），并预加载相邻两张原图；
 * - 照片有 EXIF（takenAt / camera）时展示，没有则整行隐藏；
 * - 打开期间锁定 body 滚动，blur 占位图作为原图加载时的背景；
 * - 打开时焦点移入对话框、Tab 焦点圈闭在对话框内、关闭时归还给触发元素。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent } from 'react';
import type { Photo } from '../../types';

/** PhotoGrid 派发的打开事件名（保持与 PhotoGrid.astro 中一致） */
const OPEN_EVENT = 'gallery:open';

interface OpenEventDetail {
  index: number;
}

interface Props {
  photos: Photo[];
  albumTitle: string;
}

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
  const count = photos.length;

  const close = useCallback(() => setIndex(null), []);

  const step = useCallback(
    (delta: number) => {
      setIndex((current) => {
        if (current === null || count === 0) return current;
        return (current + delta + count) % count;
      });
    },
    [count],
  );

  // 监听静态网格派发的打开事件（带越界钳制）
  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<OpenEventDetail>).detail;
      if (!detail || !Number.isInteger(detail.index) || count === 0) return;
      setIndex(Math.max(0, Math.min(detail.index, count - 1)));
    };
    document.addEventListener(OPEN_EVENT, onOpen);
    return () => document.removeEventListener(OPEN_EVENT, onOpen);
  }, [count]);

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

  // 预加载相邻两张原图，让切换更顺滑
  useEffect(() => {
    if (index === null || count < 2) return;
    for (const delta of [-1, 1]) {
      const neighbor = photos[(index + delta + count) % count];
      if (neighbor) {
        const img = new Image();
        img.src = neighbor.src;
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
      className="fixed inset-0 z-[100] flex flex-col bg-night/95 backdrop-blur-sm"
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
        <p className="shrink-0 text-sm font-medium text-white">
          第 {index + 1} / {count} 张
        </p>
        {hasInfo && (
          <p className="hidden min-w-0 truncate text-xs text-white/70 md:block">
            {photo.scene && <span className="text-white/90">{photo.scene}</span>}
            {photo.scene && hasExif && <span className="mx-2">·</span>}
            {photo.takenAt && <span>📅 {formatTakenAt(photo.takenAt)}</span>}
            {photo.takenAt && photo.camera && <span className="mx-2">·</span>}
            {photo.camera && <span>📷 {photo.camera}</span>}
          </p>
        )}
        <button
          type="button"
          onClick={close}
          aria-label="关闭灯箱（Esc）"
          className="shrink-0 cursor-pointer rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white/85 transition-colors hover:border-white hover:text-white"
        >
          ✕ 关闭
        </button>
      </div>

      {/* 图片区：原图只在灯箱内加载，blur 占位图作为加载背景 */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-12 sm:px-24">
        <img
          key={photo.src}
          src={photo.src}
          alt={`${albumTitle} · 第 ${index + 1} 张`}
          className="max-h-full max-w-full rounded-lg object-contain"
          style={{
            backgroundImage: `url("${photo.blur}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          onClick={stopPropagation}
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
        ← / → 切换 · Esc 或点击空白处关闭
      </p>
    </div>
  );
}
