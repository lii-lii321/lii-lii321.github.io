/**
 * 数据驾驶舱聚合函数单测：月/日桶、排序、缺 EXIF 计数、省级行政区归并。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateStats } from '../src/components/stats/aggregate.ts';
import type { TravelData } from '../src/types';

const fixture = {
  stats: { countries: 1, provinces: 2, photoCount: 4 },
  trips: [
    {
      id: 'a',
      title: '山东半岛',
      date: '2025-12-15',
      tags: [],
      description: '',
      place: { name: '青岛', country: '中国', province: '山东', lng: 120, lat: 36 },
      cover: '/photos/a/0001.jpg',
      photos: [
        { src: '/photos/a/0001.jpg', blur: '', width: 100, height: 100, takenAt: '2025-12-15T08:00:00.000Z', camera: 'Canon EOS 600D', gps: null, scene: null },
        { src: '/photos/a/0002.jpg', blur: '', width: 100, height: 100, takenAt: '2025-12-15T09:00:00.000Z', camera: 'Canon EOS 600D', gps: null, scene: null },
        { src: '/photos/a/0003.jpg', blur: '', width: 100, height: 100, takenAt: null, camera: null, gps: null, scene: null },
      ],
    },
    {
      id: 'b',
      title: '贵州山水',
      date: '2026-08-25',
      tags: [],
      description: '',
      place: { name: '荔波', country: '中国', province: '贵州', lng: 107, lat: 25 },
      cover: '/photos/b/001.jpg',
      photos: [
        { src: '/photos/b/001.jpg', blur: '', width: 100, height: 100, takenAt: '2026-08-25T10:00:00.000Z', camera: 'iPhone 15 Pro', gps: null, scene: null },
      ],
    },
  ],
} as unknown as TravelData;

test('aggregateStats：按月/日聚合、升序排列、缺 EXIF 正确计数', () => {
  const s = aggregateStats(fixture);
  assert.equal(s.total, 4);
  assert.equal(s.noTakenAt, 1);
  assert.deepEqual(s.months, [
    ['2025-12', 2],
    ['2026-08', 1],
  ]);
  assert.deepEqual(s.days[0], ['2025-12-15', 2]);
  assert.deepEqual(s.dayRange, ['2025-12-15', '2026-08-25']);
  assert.deepEqual(s.years, ['2025', '2026']);
});

test('aggregateStats：省份照片归并与降序、相机型号分组、相册规模降序', () => {
  const s = aggregateStats(fixture);
  assert.deepEqual(s.provinces, [
    ['山东', 3],
    ['贵州', 1],
  ]);
  assert.deepEqual(s.cameras, [
    ['Canon EOS 600D', 2],
    // 数量并列时按码点序（locale 无关，本地与 CI 恒定一致）
    ['iPhone 15 Pro', 1],
    ['未记录', 1],
  ]);
  assert.deepEqual(s.tripSizes, [
    ['山东半岛', 3],
    ['贵州山水', 1],
  ]);
});

test('aggregateStats：无拍摄时间记录时 dayRange 为 null', () => {
  const empty = {
    stats: { countries: 1, provinces: 1, photoCount: 0 },
    trips: [],
  } as unknown as TravelData;
  const s = aggregateStats(empty);
  assert.equal(s.total, 0);
  assert.equal(s.dayRange, null);
  assert.deepEqual(s.years, []);
});
