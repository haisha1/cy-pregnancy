import { ApiError } from "./http";
/** 只有用户点击登录/保存资料才调用，不在App.onLaunch偷偷创建账号。 */
export function wechatCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    uni.login({
      provider: "weixin",
      timeout: 10000,
      success(result) {
        if (result.code) resolve(result.code);
        else
          reject(
            new ApiError(401, "WX_CODE_MISSING", "未取得微信登录凭证，请重试"),
          );
      },
      fail() {
        reject(
          new ApiError(
            0,
            "WX_LOGIN_FAILED",
            "微信登录未完成，可以继续游客使用",
          ),
        );
      },
    });
    return;
    // #endif
    reject(
      new ApiError(
        503,
        "WECHAT_ONLY",
        "请在微信小程序中登录，当前环境可继续使用游客工具",
      ),
    );
  });
}
