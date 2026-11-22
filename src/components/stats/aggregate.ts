/**
 * 数据驾驶舱聚合（纯函数，构建期 + 单测共用）：
 * 从 travels.json 聚合出时间/地点/器材/相册规模四类视图的数据。
 * takenAt 约定为「拍摄地墙钟时间按 UTC 序列化」（见 build-photos.mjs），
 * 因此直接对 ISO 串做 slice 得到年月/日期，与展示口径一致。
 */
import type { TravelData } from '../../types';

export interface StatsAggregates {
  /** 入库照片总数 */
  total: number;
  /** 缺少拍摄时间（EXIF 被剥离）的照片数，不计入时间维度 */
  noTakenAt: number;
  /** 按月聚合：['YYYY-MM', 数量]，升序 */
  months: [string, number][];
  /** 按日聚合（快门日历）：['YYYY-MM-DD', 数量]，升序 */
  days: [string, number][];
  /** 有拍摄记录的日期范围；一张都没有时为 null */
  dayRange: [string, string] | null;
  /** 有照片的年份，升序 */
  years: string[];
  /** 按省级行政区聚合照片数（境外用国家名），降序 */
  provinces: [string, number][];
  /** 按相机型号聚合（EXIF 缺失计「未记录」），降序 */
  cameras: [string, number][];
  /** 各相册照片数，降序 */
  tripSizes: [string, number][];
}

export function aggregateStats(travels: TravelData): StatsAggregates {
  const months = new Map<string, number>();
  const days = new Map<string, number>();
  const provinces = new Map<string, number>();
  const cameras = new Map<string, number>();
  const tripSizes: [string, number][] = [];
  let noTakenAt = 0;
  let total = 0;

  for (const trip of travels.trips) {
    tripSizes.push([trip.title, trip.photos.length]);
    total += trip.photos.length;
    const placeName = trip.place.province ?? trip.place.country;
    provinces.set(placeName, (provinces.get(placeName) ?? 0) + trip.photos.length);
    for (const photo of trip.photos) {
      const cam = photo.camera?.trim() || '未记录';
      cameras.set(cam, (cameras.get(cam) ?? 0) + 1);
      if (!photo.takenAt) {
        noTakenAt += 1;
        continue;
      }
      const month = photo.takenAt.slice(0, 7);
      const day = photo.takenAt.slice(0, 10);
      months.set(month, (months.get(month) ?? 0) + 1);
      days.set(day, (days.get(day) ?? 0) + 1);
    }
  }

  const monthList = [...months.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const dayList = [...days.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const years = [...new Set(dayList.map(([d]) => d.slice(0, 4)))].sort();
  const dayRange: [string, string] | null = dayList.length
    ? [dayList[0][0], dayList[dayList.length - 1][0]]
    : null;

  return {
    total,
    noTakenAt,
    months: monthList,
    days: dayList,
    dayRange,
    years,
    // 数量降序 + 名称字典序 tie-break：并列时顺序完全确定（单测可精确断言）
    provinces: [...provinces.entries()].sort(byCountDesc),
    cameras: [...cameras.entries()].sort(byCountDesc),
    tripSizes: tripSizes.sort(byCountDesc),
  };
}

// 数量降序 + 名称码点序 tie-break：localeCompare 的 CJK/拉丁排序随平台 ICU 不同
// （本地 Windows 与 CI Linux 实测相反），码点比较跨平台恒定
const byCountDesc = (a: [string, number], b: [string, number]) =>
  b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
