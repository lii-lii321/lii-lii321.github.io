/**
 * 照片墙分组与折叠的纯函数（服务端模板与客户端脚本共用，node --test 可测，
 * 见 tests/gallery-utils.test.ts）。
 */
import type { Photo } from '../../types';

/** 一个子景点分组（scene 为 null 表示该相册没有子景点结构） */
export interface SceneGroup {
  scene: string | null;
  items: Photo[];
}

/** 按连续区段分组的子景点（photos 有序，同一景点的抽样天然连续）；无子景点时只有一个 null 组 */
export function groupByScene(photos: Photo[]): SceneGroup[] {
  const groups: SceneGroup[] = [];
  photos.forEach((photo) => {
    const last = groups[groups.length - 1];
    if (last && last.scene === (photo.scene ?? null)) last.items.push(photo);
    else groups.push({ scene: photo.scene ?? null, items: [photo] });
  });
  return groups;
}

/** 折叠计划：每组可见张数与整组被折叠隐藏的分组下标 */
export interface FoldPlan {
  visiblePerGroup: number[];
  hiddenGroups: number[];
}

/**
 * 全局 LIMIT 折叠在分组下的可见计划：按全局序号截断，
 * 限额用尽后的组一张不可见（对应「整组隐藏的分区」）。
 */
export function planFold(groupSizes: number[], limit: number): FoldPlan {
  const visiblePerGroup: number[] = [];
  const hiddenGroups: number[] = [];
  let used = 0;
  groupSizes.forEach((size, gi) => {
    const visible = Math.max(0, Math.min(size, limit - used));
    used += visible;
    visiblePerGroup.push(visible);
    if (size > 0 && visible === 0) hiddenGroups.push(gi);
  });
  return { visiblePerGroup, hiddenGroups };
}

/** 分区计数文案：部分折叠时如实展示「已展示 X / 共 N 张」，而不是悬空的总数 */
export function sectionCountText(total: number, visible: number): string {
  return visible < total ? `已展示 ${visible} / 共 ${total} 张` : `${total} 张`;
}

/** 封面 srcset：640/1280 缩略图两档 + 原图整档（thumb2x 缺省时跳过）。
 *  TravelIsland（首页）与相册页头图共用同一拼接口径，避免两处漂移。 */
export function coverSrcset(
  photo: { thumb: string; thumb2x?: string; width: number },
  fallbackSrc: string,
): string {
  return [
    `${photo.thumb} 640w`,
    photo.thumb2x && `${photo.thumb2x} 1280w`,
    `${fallbackSrc} ${photo.width}w`,
  ]
    .filter((s): s is string => Boolean(s))
    .join(', ');
}
