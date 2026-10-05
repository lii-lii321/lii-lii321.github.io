/**
 * 足迹地图 island（仅在客户端初始化 ECharts，页面通过 client:load 挂载）。
 *
 * 职责：
 * - 世界 / 中国视图切换（tab）；
 * - 拉取本地 GeoJSON（src/assets/geo/*.json?url，同源静态资源，不请求任何外部地图服务），
 *   registerMap 后渲染 geo + 发光散点（effectScatter，大小随照片数）；
 * - 点亮 visited 名单（世界=国家琥珀色，中国=省份天蓝色）；
 * - 点击标记弹出侧面板，列出该地点的旅行卡片，点击卡片跳 /travel/<id>；
 * - 处理 resize（ResizeObserver）与卸载（dispose），任一地图数据失败时给出降级 UI，页面不崩。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts/core';
import { EffectScatterChart } from 'echarts/charts';
import { GeoComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsType } from 'echarts/core';
import type { Trip, VisitedData } from '../../types';
import worldUrl from '../../assets/geo/world.json?url';
import chinaUrl from '../../assets/geo/china.json?url';
import {
  buildMapOption,
  buildNameMap,
  clusterTripsByPlace,
  resolveHighlighted,
  type MapView,
  type PlaceCluster,
} from './mapOptions';

// 按需注册：geo + 涟漪散点 + tooltip + canvas 渲染器
echarts.use([EffectScatterChart, GeoComponent, TooltipComponent, CanvasRenderer]);

interface GeoFeatureCollection {
  features: { properties?: { name?: string } }[];
}

type GeoStatus = 'loading' | 'ready' | 'error';

interface Props {
  trips: Trip[];
  visited: VisitedData;
}

const VIEWS: { key: MapView; label: (visited: VisitedData) => string }[] = [
  { key: 'world', label: (v) => `世界 · ${v.countries.length} 国` },
  { key: 'china', label: (v) => `中国 · ${v.provinces.length} 省` },
];

const VIEW_LABEL_CN: Record<MapView, string> = { world: '世界地图', china: '中国地图' };

export default function TravelMap({ trips, visited }: Props) {
  const [view, setView] = useState<MapView>('world');
  const [status, setStatus] = useState<Record<MapView, GeoStatus>>({
    world: 'loading',
    china: 'loading',
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const geoRef = useRef<Partial<Record<MapView, GeoFeatureCollection>>>({});

  const clusters = useMemo(() => clusterTripsByPlace(trips), [trips]);
  const selected: PlaceCluster | null =
    clusters.find((c) => c.key === selectedKey) ?? null;

  /* ① 初始化图表、拉取两份本地 GeoJSON、resize 监听、卸载 dispose */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = echarts.init(el);
    chartRef.current = chart;

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);

    let cancelled = false;
    const sources: { view: MapView; url: string }[] = [
      { view: 'world', url: worldUrl },
      { view: 'china', url: chinaUrl },
    ];
    Promise.all(
      sources.map(async ({ view: v, url }) => {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const geo = (await res.json()) as GeoFeatureCollection;
          if (cancelled) return;
          geoRef.current[v] = geo;
          echarts.registerMap(v, geo as never);
          setStatus((s) => ({ ...s, [v]: 'ready' }));
        } catch {
          if (!cancelled) setStatus((s) => ({ ...s, [v]: 'error' }));
        }
      }),
    ).catch(() => {
      /* 单个视图的失败已在上面各自捕获，这里兜底避免未处理的 Promise 拒绝 */
    });

    return () => {
      cancelled = true;
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  /* ② 视图 / 地图就绪 / 数据变化时重建 option 并绑定事件 */
  useEffect(() => {
    const chart = chartRef.current;
    const geo = geoRef.current[view];
    if (!chart || status[view] !== 'ready' || !geo) return;

    const featureNames = geo.features.map((f) => f.properties?.name ?? '');
    try {
      chart.setOption(
        buildMapOption({
          view,
          clusters,
          highlighted: resolveHighlighted(
            view,
            featureNames,
            visited.countries,
            visited.provinces,
          ),
          nameMap: buildNameMap(view, featureNames),
        }),
        true,
      );
    } catch {
      /* option 构建或渲染异常时不让页面崩掉，地图区域保持空白底色 */
      return;
    }

    const handleMarkerClick = (
      params: { componentType?: string; seriesType?: string; data?: { placeKey?: string } },
    ) => {
      if (
        params?.componentType === 'series' &&
        params?.seriesType === 'effectScatter' &&
        params?.data?.placeKey
      ) {
        setSelectedKey(params.data.placeKey);
      }
    };
    const handleBlankClick = (e: { target?: unknown }) => {
      // 点在空白处（海洋 / 画布外）时收起侧面板
      if (!e.target) setSelectedKey(null);
    };

    chart.off('click');
    chart.on('click', handleMarkerClick as never);
    const zr = chart.getZr();
    zr.off('click');
    zr.on('click', handleBlankClick);

    return () => {
      chart.off('click');
      zr.off('click');
    };
  }, [view, status, clusters, visited]);

  /* ③ Esc 收起侧面板 */
  useEffect(() => {
    if (!selectedKey) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedKey(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedKey]);

  const switchView = (next: MapView) => {
    setView(next);
    setSelectedKey(null);
  };

  return (
    <div className="overflow-hidden rounded-[14px] border border-rule bg-paper">
      {/* 工具栏：视图 tab + 操作提示 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3 sm:px-5">
        <div
          role="group"
          aria-label="地图视图切换"
          className="flex gap-1 rounded-full border border-rule bg-paper-2 p-1"
        >
          {VIEWS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={view === key}
              onClick={() => switchView(key)}
              className={
                view === key
                  ? 'cursor-pointer rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-paper transition-colors hover:bg-accent'
                  : 'cursor-pointer rounded-full px-4 py-1.5 text-sm text-ink-2 transition-colors hover:text-ink'
              }
            >
              {label(visited)}
            </button>
          ))}
        </div>
        <p className="hidden text-xs text-ink-3 sm:block">
          拖拽平移 · 滚轮缩放 · 点击光点查看当地旅行
        </p>
      </div>

      {/* 地图主体 + 覆盖层（加载 / 降级 / 侧面板） */}
      <div className="relative h-[420px] bg-paper sm:h-[520px] lg:h-[580px]">
        <div ref={containerRef} className="h-full w-full" />

        {status[view] === 'loading' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="animate-pulse text-sm text-ink-3">地图数据加载中……</p>
          </div>
        )}

        {status[view] === 'error' && (
          <GeoFallback view={view} trips={trips} visited={visited} />
        )}

        {selected && <PlacePanel cluster={selected} onClose={() => setSelectedKey(null)} />}
      </div>

      {/* 侧面板出入场动画（组件内自带，避免改动全局样式） */}
      <style>{`
        @keyframes travel-panel-in {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

/** 单个地点的侧面板：标题区 + 旅行卡片列表（点击跳 /travel/<id>） */
function PlacePanel({ cluster, onClose }: { cluster: PlaceCluster; onClose: () => void }) {
  return (
    <aside
      className="absolute inset-y-0 right-0 z-20 flex w-full max-w-sm flex-col border-l border-rule bg-paper"
      style={{ animation: 'travel-panel-in 0.22s ease' }}
      aria-label={`${cluster.name} 的旅行`}
    >
      <header className="flex items-start justify-between gap-3 border-b border-rule px-5 py-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-ink">{cluster.name}</h3>
          <p className="meta mt-1 normal-case">
            {cluster.province ? `${cluster.country} · ${cluster.province}` : cluster.country} ·{' '}
            {cluster.trips.length} 次旅行 · {cluster.photoCount} 张照片
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="收起面板"
          className="shrink-0 cursor-pointer rounded-full border border-rule-2 px-2.5 py-1 text-sm text-ink-3 transition-colors hover:border-accent hover:text-accent"
        >
          ✕
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
        {cluster.trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
      </div>
    </aside>
  );
}

/** 旅行卡片：封面缩略图（模糊占位打底）+ 标题 + 日期 + 照片数 + 标签 */
function TripCard({ trip }: { trip: Trip }) {
  const coverPhoto = trip.photos.find((p) => p.src === trip.cover) ?? trip.photos[0];
  return (
    <a
      href={`/travel/${trip.id}`}
      className="group flex gap-3 rounded-[10px] border border-rule bg-paper-2/60 p-2.5 transition-colors hover:border-accent/60 hover:bg-paper-2"
    >
      <div
        className="h-16 w-24 shrink-0 overflow-hidden rounded-[4px] bg-cover bg-center bg-paper-3"
        style={
          coverPhoto
            ? { backgroundImage: `url(${coverPhoto.blur})` }
            : undefined
        }
      >
        {coverPhoto && (
          <img
            src={coverPhoto.thumb}
            alt={trip.title}
            loading="lazy"
            decoding="async"
            className="h-16 w-24 object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <h4 className="truncate text-sm font-medium text-ink group-hover:text-accent">
          {trip.title}
        </h4>
        <p className="mt-1 text-xs text-ink-3">
          {trip.date} · {trip.photos.length} 张照片
        </p>
        {trip.tags.length > 0 && (
          <p className="mt-1.5 flex flex-wrap gap-1">
            {trip.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-accent/25 bg-accent-soft px-2 py-0.5 text-[11px] leading-none text-accent"
              >
                {tag}
              </span>
            ))}
          </p>
        )}
      </div>
    </a>
  );
}

/** 某一视图地图数据加载失败时的降级 UI：提示 + 点亮名单 + 全部旅行列表 */
function GeoFallback({
  view,
  trips,
  visited,
}: {
  view: MapView;
  trips: Trip[];
  visited: VisitedData;
}) {
  const chips = view === 'world' ? visited.countries : visited.provinces;
  return (
    <div className="absolute inset-0 overflow-y-auto px-5 py-8">
      <div className="mx-auto max-w-md rounded-[14px] border border-rule-2 bg-paper-2/70 p-6 text-center">
        <p className="text-2xl" aria-hidden="true">
          🗺️
        </p>
        <p className="mt-2 font-medium text-ink">{VIEW_LABEL_CN[view]}数据暂时加载失败</p>
        <p className="mt-1 text-sm text-ink-2">
          地图资源不可用，旅行记录仍然可以浏览；可稍后刷新重试。
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {chips.map((name) => (
            <span
              key={name}
              className="rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs text-accent"
            >
              {name}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-2">
        {trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
      </div>
    </div>
  );
}
