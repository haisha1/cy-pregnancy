/** 纯函数：胶囊上下留白相同，标题中心与胶囊中心对齐；所有数值使用逻辑px。 */
export function navigationMetrics(
  statusBarHeight: number,
  windowWidth: number,
  capsule?: { top: number; bottom: number; left: number; height: number },
) {
  const status =
    Number.isFinite(statusBarHeight) && statusBarHeight > 0
      ? statusBarHeight
      : 0;
  const valid =
    capsule &&
    capsule.top >= status &&
    capsule.height > 0 &&
    capsule.left > 0 &&
    capsule.bottom > capsule.top;
  return {
    status,
    height: valid ? capsule.height + 2 * (capsule.top - status) : 44,
    side: valid ? Math.max(52, windowWidth - capsule.left + 8) : 52,
  };
}
