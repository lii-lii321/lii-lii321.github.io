/**
 * 首页展示用的小工具（只在服务端渲染时执行，不进入客户端 bundle）。
 */
import type { Photo, Trip } from '../../types';

/** 把 ISO 日期（如 "2025-04-12"）格式化为中文长日期（如 "2025年4月12日"）；解析失败时原样返回 */
export function formatDate(iso: string): string {
  // 用本地时区解析（与 pages/travel/[id].astro 保持一致）：
  // "YYYY-MM-DD" 会被 new Date 按 UTC 零点解析，UTC 以西时区再按本地格式化会提前一天
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

/** 地点展示文案：有省份时 "云南 · 大理古城"，国外（省份为 null）时 "日本 · 东京" */
export function formatPlace(place: {
  name: string;
  country: string;
  province: string | null;
}): string {
  return place.province ? `${place.province} · ${place.name}` : `${place.country} · ${place.name}`;
}

/**
 * 取相册封面对应的 Photo（用它的 thumb / blur / 原始宽高做响应式与占位）。
 * 数据管线保证 cover 一定是相册内某张照片；万一找不到，回退为第一张。
 */
export function getCoverPhoto(trip: Trip): Photo | null {
  return trip.photos.find((p) => p.src === trip.cover) ?? trip.photos[0] ?? null;
}
