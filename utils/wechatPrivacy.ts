/** 原生隐私协议由微信后台配置，展示实际主体和条款，不用自编内容冒充平台协议。 */
declare const wx: { openPrivacyContract(options: { fail: () => void }): void };
export function openWechatPrivacy(onError: (message: string) => void) {
  // #ifdef MP-WEIXIN
  if (typeof wx !== "undefined" && wx.openPrivacyContract) {
    wx.openPrivacyContract({
      fail: () => onError("微信隐私指引暂不可用，请稍后重试或联系提供方"),
    });
    return;
  }
  // #endif
  onError("请在微信小程序中查看平台提供的隐私保护指引");
}
