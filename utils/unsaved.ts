/**
 * 未保存输入提示：把平台弹窗转换为可 await 的选择结果，是否真的保存仍由调用页面决定。
 */
export function chooseUnsavedAction(): Promise<"save" | "discard" | "stay"> {
  return new Promise((resolve) =>
    uni.showActionSheet({
      itemList: ["保留草稿并返回", "放弃修改并返回", "继续编辑"],
      success: (r) =>
        resolve(
          r.tapIndex === 0 ? "save" : r.tapIndex === 1 ? "discard" : "stay",
        ),
      fail: () => resolve("stay"),
    }),
  );
}
