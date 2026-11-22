/**
 * 数据驾驶舱图表 island（client:load）：
 * 快门日历（GitHub 式热力图，一年一行）+ 月度柱状 + 省份排行 + 器材构成 + 相册规模，
 * 数据由 stats.astro 构建期聚合（aggregate.ts），运行时零请求。
 * ECharts 按需注册（bar/heatmap/pie + calendar/grid/tooltip + canvas），
 * 与 TravelMap 的 geo chunk 完全独立，不相互拖重。
 */
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, HeatmapChart, PieChart } from 'echarts/charts';
import { CalendarComponent, GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsType } from 'echarts/core';
import type { StatsAggregates } from './aggregate';

echarts.use([
  BarChart,
  HeatmapChart,
  PieChart,
  CalendarComponent,
  GridComponent,
  TooltipComponent,
  CanvasRenderer,
]);

interface Props {
  data: StatsAggregates;
}

/* 设计令牌与 global.css @theme 同源 */
const ACCENT = '#2f4bff';
const INK3 = '#6f6f7a';
const RULE = '#e2dfd6';
const MONO = 'JetBrains Mono, ui-monospace, SFMono-Regular, Consolas, monospace';

const AXIS_TEXT = { fontSize: 10, color: INK3, fontFamily: MONO } as const;
const AXIS_LINE = { lineStyle: { color: RULE } } as const;
const TOOLTIP = {
  trigger: 'item' as const,
  confine: true,
  textStyle: { fontSize: 11, fontFamily: MONO },
};

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

export default function StatsCharts({ data }: Props) {
  const roots = useRef<(HTMLDivElement | null)[]>([]);
  const setRoot = (i: number) => (el: HTMLDivElement | null) => {
    roots.current[i] = el;
  };

  useEffect(() => {
    const charts: EChartsType[] = [];
    for (const el of roots.current) {
      if (!el) continue;
      const chart = echarts.init(el);
      try {
        chart.setOption(optionFor(el.dataset.chart ?? '', data));
      } catch {
        /* 单图渲染失败不让整页崩 */
      }
      charts.push(chart);
    }
    const onResize = () => charts.forEach((c) => c.resize());
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      charts.forEach((c) => c.dispose());
    };
  }, [data]);

  const cardClass =
    'rounded-[14px] border border-rule bg-paper p-4 sm:p-5 [&_canvas]:!w-full [&_canvas]:!h-auto';

  return (
    <div className="mt-10 grid gap-6 md:grid-cols-2">
      {/* 快门日历：一年一行铺满宽度 */}
      <section className="md:col-span-2">
        <div className={cardClass}>
          <h3 className="h3">快门日历</h3>
          <p className="meta mt-1 normal-case">
            每一格是一天，颜色深浅是当天入库照片数——深色格是出门拍摄的日子
          </p>
          <div
            ref={setRoot(0)}
            data-chart="calendar"
            className="mt-2 w-full"
            style={{ height: data.years.length * 200 + 40 }}
          />
        </div>
      </section>

      <section>
        <div className={cardClass}>
          <h3 className="h3">月度快门</h3>
          <p className="meta mt-1 normal-case">按拍摄月份聚合</p>
          <div ref={setRoot(1)} data-chart="monthly" className="mt-2 w-full" style={{ height: 260 }} />
        </div>
      </section>

      <section>
        <div className={cardClass}>
          <h3 className="h3">器材构成</h3>
          <p className="meta mt-1 normal-case">EXIF 相机型号分布（缺失计「未记录」）</p>
          <div ref={setRoot(2)} data-chart="cameras" className="mt-2 w-full" style={{ height: 260 }} />
        </div>
      </section>

      <section>
        <div className={cardClass}>
          <h3 className="h3">足迹分布</h3>
          <p className="meta mt-1 normal-case">各省级行政区入库照片数</p>
          <div ref={setRoot(3)} data-chart="provinces" className="mt-2 w-full" style={{ height: 240 }} />
        </div>
      </section>

      <section>
        <div className={cardClass}>
          <h3 className="h3">相册规模</h3>
          <p className="meta mt-1 normal-case">每本相册的照片数，从多到少</p>
          <div ref={setRoot(4)} data-chart="trips" className="mt-2 w-full" style={{ height: 240 }} />
        </div>
      </section>
    </div>
  );
}

/** 每张图的 option 构建（按 data-chart 值分发） */
function optionFor(kind: string, data: StatsAggregates): Record<string, unknown> {
  switch (kind) {
    case 'calendar':
      return calendarOption(data);
    case 'monthly':
      return monthlyOption(data);
    case 'cameras':
      return camerasOption(data);
    case 'provinces':
      return barOption(data.provinces, '张');
    case 'trips':
      return barOption(
        data.tripSizes.map(([t, v]) => [truncate(t, 14), v] as [string, number]),
        '张',
      );
    default:
      return {};
  }
}

/** 快门日历：每年一行日历 + 热力色阶 */
function calendarOption(data: StatsAggregates): Record<string, unknown> {
  const max = Math.max(1, ...data.days.map(([, v]) => v));
  const calendars = data.years.map((year, i) => ({
    top: 28 + i * 200,
    left: 46,
    right: 10,
    cellSize: ['auto', 17],
    range: year,
    itemStyle: { color: 'transparent', borderColor: RULE, borderWidth: 1 },
    dayLabel: { nameMap: 'ZH', firstDay: 1, ...AXIS_TEXT },
    monthLabel: { nameMap: 'ZH', ...AXIS_TEXT },
    yearLabel: { show: false },
  }));
  return {
    tooltip: TOOLTIP,
    visualMap: {
      min: 1,
      max,
      show: false,
      inRange: { color: ['#e8ebff', '#93a1ff', ACCENT] },
    },
    calendars,
    series: data.years.map((year, i) => ({
      type: 'heatmap',
      coordinateSystem: 'calendar',
      calendarIndex: i,
      data: data.days.filter(([d]) => d.startsWith(year)),
      itemStyle: { borderRadius: 2 },
    })),
  };
}

/** 月度快门柱状 */
function monthlyOption(data: StatsAggregates): Record<string, unknown> {
  return {
    tooltip: { ...TOOLTIP, trigger: 'axis' },
    grid: { left: 36, right: 12, top: 24, bottom: 64 },
    xAxis: {
      type: 'category',
      data: data.months.map(([m]) => m.slice(2)), // '25-01' 更紧凑
      axisLabel: { ...AXIS_TEXT, rotate: 45 },
      axisLine: AXIS_LINE,
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: AXIS_TEXT,
      splitLine: { lineStyle: { color: RULE } },
    },
    series: [
      {
        type: 'bar',
        data: data.months.map(([, v]) => v),
        itemStyle: { color: ACCENT, borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 18,
      },
    ],
  };
}

/** 器材构成环形图（型号过多时折叠为「其他」） */
function camerasOption(data: StatsAggregates): Record<string, unknown> {
  const top = 7;
  const head = data.cameras.slice(0, top);
  const rest = data.cameras.slice(top).reduce((sum, [, v]) => sum + v, 0);
  const rows = rest > 0 ? [...head, ['其他', rest] as [string, number]] : head;
  return {
    tooltip: TOOLTIP,
    series: [
      {
        type: 'pie',
        radius: ['40%', '66%'],
        center: ['50%', '50%'],
        data: rows.map(([name, value]) => ({ name: truncate(name, 22), value })),
        label: { ...AXIS_TEXT, formatter: '{b} {c}' },
        labelLine: { lineStyle: { color: RULE } },
        itemStyle: { borderRadius: 3, borderColor: '#fff', borderWidth: 1 },
        color: [ACCENT, '#93a1ff', '#38bdf8', '#f59e0b', '#22a06b', '#c2b280', '#9aa0b5', '#d5d2c6'],
      },
    ],
  };
}

/** 横向排行条形图（省份/相册规模共用） */
function barOption(rows: [string, number][], unit: string): Record<string, unknown> {
  return {
    tooltip: { ...TOOLTIP, trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 96, right: 44, top: 12, bottom: 24 },
    xAxis: {
      type: 'value',
      axisLabel: AXIS_TEXT,
      splitLine: { lineStyle: { color: RULE } },
    },
    yAxis: {
      type: 'category',
      data: rows.map(([name]) => name),
      inverse: true,
      axisLabel: AXIS_TEXT,
      axisLine: AXIS_LINE,
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: rows.map(([, v]) => v),
        itemStyle: { color: ACCENT, borderRadius: [0, 3, 3, 0] },
        barMaxWidth: 14,
        label: {
          show: true,
          position: 'right',
          formatter: `{c}${unit}`,
          ...AXIS_TEXT,
          color: INK3,
        },
      },
    ],
  };
}
