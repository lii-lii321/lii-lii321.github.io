/**
 * 地图纯函数单元测试（node --test，Node 24 原生 TS 类型剥离）。
 * 覆盖：省份名归一化、标记大小、地点聚合、点亮名单解析。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeProvinceName,
  markerSymbolSize,
  clusterTripsByPlace,
  resolveHighlighted,
  WORLD_NAME_MAP,
} from '../src/components/map/mapOptions.ts';
import type { Trip } from '../src/types.ts';

test('normalizeProvinceName：省/市/自治区后缀剥离', () => {
  assert.equal(normalizeProvinceName('云南省'), '云南');
  assert.equal(normalizeProvinceName('北京市'), '北京');
  assert.equal(normalizeProvinceName('内蒙古自治区'), '内蒙古');
  assert.equal(normalizeProvinceName('新疆维吾尔自治区'), '新疆');
  assert.equal(normalizeProvinceName('广西壮族自治区'), '广西');
  assert.equal(normalizeProvinceName('香港特别行政区'), '香港');
  assert.equal(normalizeProvinceName('黑龙江省'), '黑龙江');
});

test('markerSymbolSize：随照片数缓增且封顶', () => {
  assert.equal(markerSymbolSize(0), markerSymbolSize(1)); // 无照片按 1 处理
  assert.ok(markerSymbolSize(1) > 9 - 0.001 && markerSymbolSize(1) < 12);
  assert.ok(markerSymbolSize(4) > markerSymbolSize(1)); // 单调
  assert.equal(markerSymbolSize(10_000), 34); // 封顶
});

function fakeTrip(id: string, country: string, placeName: string, date: string, photoCount: number): Trip {
  return {
    id,
    title: id,
    date,
    tags: [],
    description: '',
    place: { name: placeName, country, province: null, lng: 100, lat: 25 },
    cover: '',
    photos: Array.from({ length: photoCount }, () => ({
      src: '', thumb: '', blur: '', width: 0, height: 0,
      takenAt: null, camera: null, gps: null, scene: null,
    })),
  };
}

test('clusterTripsByPlace：同地点聚合且按日期倒序', () => {
  const clusters = clusterTripsByPlace([
    fakeTrip('a', '中国', '大理古城', '2025-01-19', 2),
    fakeTrip('b', '中国', '大理古城', '2024-03-01', 3),
    fakeTrip('c', '中国', '青城后山', '2025-04-11', 1),
  ]);
  assert.equal(clusters.length, 2);
  const dali = clusters.find((c) => c.name === '大理古城')!;
  assert.equal(dali.photoCount, 5);
  assert.deepEqual(dali.trips.map((t) => t.id), ['a', 'b']); // 日期倒序
});

test('resolveHighlighted：world 视图按中文名过滤未知国家', () => {
  const picked = resolveHighlighted('world', ['China', 'Japan'], ['中国', '不存在国'], []);
  assert.deepEqual(picked, ['中国']);
  assert.ok(Object.values(WORLD_NAME_MAP).includes('日本')); // nameMap 覆盖日本
});

test('resolveHighlighted：china 视图按简称匹配全称 feature', () => {
  const features = ['云南省', '四川省', '内蒙古自治区'];
  const picked = resolveHighlighted('china', features, [], ['云南', '内蒙古', '不存在省']);
  assert.deepEqual(picked, ['云南', '内蒙古']);
});
