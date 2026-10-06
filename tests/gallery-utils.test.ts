/**
 * 照片墙分组 / 折叠纯函数单元测试。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { coverSrcset, groupByScene, planFold, sectionCountText } from '../src/components/gallery/utils.ts';
import type { Photo } from '../src/types';

const photo = (scene: string | null): Photo => ({
  src: 'x.jpg',
  thumb: 'x.webp',
  blur: '',
  width: 100,
  height: 100,
  takenAt: null,
  camera: null,
  gps: null,
  scene,
});

test('groupByScene：连续相同 scene 归入同组，不连续则重新开组', () => {
  const groups = groupByScene([photo('a'), photo('a'), photo('b'), photo(null), photo('b')]);
  assert.deepEqual(
    groups.map((g) => [g.scene, g.items.length]),
    [
      ['a', 2],
      ['b', 1],
      [null, 1],
      ['b', 1],
    ],
  );
});

test('groupByScene：无子景点时只有一个 null 组', () => {
  const groups = groupByScene([photo(null), photo(null)]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].scene, null);
  assert.equal(groups[0].items.length, 2);
});

test('groupByScene：空数组返回空', () => {
  assert.deepEqual(groupByScene([]), []);
});

test('planFold：全局序号截断（重庆分布 10/28/22，LIMIT=24 → 10/14/0）', () => {
  const plan = planFold([10, 28, 22], 24);
  assert.deepEqual(plan.visiblePerGroup, [10, 14, 0]);
  assert.deepEqual(plan.hiddenGroups, [2]);
});

test('planFold：总数不超限时全部可见', () => {
  const plan = planFold([5, 5], 24);
  assert.deepEqual(plan.visiblePerGroup, [5, 5]);
  assert.deepEqual(plan.hiddenGroups, []);
});

test('planFold：恰好用尽限额，后续整组隐藏', () => {
  const plan = planFold([24, 10], 24);
  assert.deepEqual(plan.visiblePerGroup, [24, 0]);
  assert.deepEqual(plan.hiddenGroups, [1]);
});

test('sectionCountText：部分折叠如实计数，全可见显示总数', () => {
  assert.equal(sectionCountText(28, 14), '已展示 14 / 共 28 张');
  assert.equal(sectionCountText(22, 22), '22 张');
  assert.equal(sectionCountText(10, 0), '已展示 0 / 共 10 张');
});

test('coverSrcset：三档拼接，thumb2x 缺省时跳过 1280w 档', () => {
  assert.equal(
    coverSrcset({ thumb: 'a-640.webp', thumb2x: 'a-1280.webp', width: 4032 }, 'a.jpg'),
    'a-640.webp 640w, a-1280.webp 1280w, a.jpg 4032w',
  );
  assert.equal(
    coverSrcset({ thumb: 'a-640.webp', width: 4032 }, 'a.jpg'),
    'a-640.webp 640w, a.jpg 4032w',
  );
});
