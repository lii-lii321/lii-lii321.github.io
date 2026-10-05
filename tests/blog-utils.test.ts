/**
 * 博客工具函数单元测试。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readingMinutes, formatDateCN, formatISO } from '../src/components/blog/utils.ts';

test('readingMinutes：中文按 400 字/分钟', () => {
  assert.equal(readingMinutes('汉'.repeat(800)), 2);
  assert.equal(readingMinutes('汉'.repeat(399)), 1);
});

test('readingMinutes：西文按 200 词/分钟', () => {
  assert.equal(readingMinutes(Array.from({ length: 600 }, () => 'word').join(' ')), 3);
});

test('readingMinutes：空/未定义兜底为 1', () => {
  assert.equal(readingMinutes(undefined), 1);
  assert.equal(readingMinutes(null), 1);
  assert.equal(readingMinutes(''), 1);
});

test('formatDateCN / formatISO：本地时区渲染，不受 UTC 偏移影响', () => {
  const d = new Date('2025-08-14T00:00:00');
  assert.equal(formatDateCN(d), '2025 年 8 月 14 日');
  assert.equal(formatISO(d), '2025-08-14');
});
