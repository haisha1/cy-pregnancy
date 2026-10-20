/**
 * 交互反馈适配：封装 uni-app 提示与确认弹窗，业务调用方根据返回结果决定后续保存或删除。
 */
export function notify(
  message: string,
  kind: "success" | "error" | "info" = "info",
) {
  uni.showToast({
    title: message,
    icon: kind === "success" ? "success" : "none",
    duration: 2400,
  });
}
/** Platform-owned modal; shared for overwrite and delete confirmation. */
export function confirmAction(
  title: string,
  content: string,
): Promise<boolean> {
  return new Promise((resolve) =>
    uni.showModal({
      title,
      content,
      confirmText: "确认",
      cancelText: "取消",
      success: (result) => resolve(result.confirm),
      fail: () => resolve(false),
    }),
  );
}
