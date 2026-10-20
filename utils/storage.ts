/**
 * 本地存储适配：在 uni-app 同步存储与业务对象之间转换 JSON；读取返回 unknown，业务 store 仍需校验数据形状。
 */
export const STORAGE_KEYS = {
  app: "cy:app:v1",
  profile: "cy:profile:v1",
} as const;
export function readStored(key: string): unknown {
  // unknown 要求调用方先确认类型；不要把 JSON.parse 的结果直接当成可信的业务对象。
  const raw = uni.getStorageSync(key);
  return typeof raw === "string" && raw ? JSON.parse(raw) : raw || null;
}
export function writeStored(key: string, data: unknown): void {
  // 同步接口失败会抛出异常，让 store 决定怎样反馈；这里不吞异常，也不提前显示成功。
  uni.setStorageSync(key, JSON.stringify(data));
}
