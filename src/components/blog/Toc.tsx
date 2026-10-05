/**
 * 文章目录 island（规格 §9.1 Toc）：
 * - 目录静态生成（由页面从 Markdown headings 传入），本组件只负责滚动高亮；
 * - IntersectionObserver 观察标题元素，当前项加 accent 2px 左边线；
 * - 滚动零卡顿：rootMargin 收窄激活带，无 scroll 监听。
 */
import { useEffect, useRef, useState } from 'react';

export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

interface Props {
  headings: TocHeading[];
}

export default function Toc({ headings }: Props) {
  const [activeId, setActiveId] = useState<string | null>(headings[0]?.id ?? null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current?.disconnect();
    const targets = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // 取视口激活带中最靠上的标题
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    );
    targets.forEach((el) => observer.observe(el));
    observerRef.current = observer;
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="目录" className="text-sm">
      <p className="meta mb-3">目录</p>
      <ul className="space-y-1 border-l border-rule">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              aria-current={activeId === h.id ? 'true' : undefined}
              className={`-ml-px block border-l-2 py-1 transition-colors ${
                h.level >= 3 ? 'pl-7' : 'pl-4'
              } ${
                activeId === h.id
                  ? 'border-accent font-medium text-accent'
                  : 'border-transparent text-ink-3 hover:border-rule-2 hover:text-ink-2'
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
