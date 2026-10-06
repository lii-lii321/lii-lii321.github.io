/**
 * 相册页内嵌单点小地图（client:idle island，位于折叠线下方，空闲时再水合拉取 GeoJSON）：
 * - 国内相册用中国地图，国外用世界地图；只画一个涟漪光点，不可拖拽；
 * - GeoJSON 复用 /travel 页已本地化的资源，模块级缓存避免重复拉取。
 */
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { EffectScatterChart } from 'echarts/charts';
import { GeoComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsType } from 'echarts/core';
import type { Place } from '../../types';
import chinaUrl from '../../assets/geo/china.json?url';
import worldUrl from '../../assets/geo/world.json?url';

echarts.use([EffectScatterChart, GeoComponent, CanvasRenderer]);

interface Props {
  /** 只收地点子集：island props 会被整体序列化进 HTML，收窄可避免把整本相册的照片数组（约 25KB）再带一份 */
  place: Place;
}
const geoCache = new Map<string, Promise<void>>();

function loadGeo(view: 'china' | 'world'): Promise<void> {
  const cached = geoCache.get(view);
  if (cached) return cached;
  const url = view === 'china' ? chinaUrl : worldUrl;
  const task = fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((geo) => echarts.registerMap(view, geo as never));
  geoCache.set(view, task);
  return task;
}

export default function MiniMap({ place }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsType | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const view: 'china' | 'world' = place.province ? 'china' : 'world';
    const chart = echarts.init(el);
    chartRef.current = chart;
    let cancelled = false;

    loadGeo(view)
      .then(() => {
        if (cancelled) return;
        const zoom = view === 'china' ? (place.province === '上海' ? 4.5 : 2.2) : 2.6;
        chart.setOption({
          backgroundColor: 'transparent',
          geo: {
            map: view,
            roam: false,
            zoom,
            center: [place.lng, place.lat],
            label: { show: false },
            itemStyle: { areaColor: '#e9e6dc', borderColor: 'rgba(207,203,189,0.9)', borderWidth: 0.6 },
            emphasis: { disabled: true },
          },
          series: [
            {
              type: 'effectScatter',
              coordinateSystem: 'geo',
              symbolSize: 12,
              rippleEffect: { brushType: 'stroke', scale: 3.2, period: 4 },
              itemStyle: { color: '#2f4bff', shadowBlur: 10, shadowColor: 'rgba(47,75,255,0.5)' },
              data: [[place.lng, place.lat]],
            },
          ],
        });
      })
      .catch(() => {
        // 小地图失败静默降级：容器留空即可，不影响相册本体
      });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);
    return () => {
      cancelled = true;
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, [place]);

  return <div ref={ref} className="h-full w-full" aria-label={`${place.name} 位置小地图`} role="img" />;
}
