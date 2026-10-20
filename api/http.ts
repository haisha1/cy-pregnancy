/** uni.request同时适配微信和H5；不记录code、token、头像或健康数据。 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public requestId = "",
  ) {
    super(message);
  }
}
export function apiBase(): string {
  let base = import.meta.env?.VITE_API_BASE_URL || "";
  // #ifdef H5
  if (!base) base = "/api/v1";
  // #endif
  // #ifdef MP-WEIXIN
  if (!base && import.meta.env?.DEV) base = "http://127.0.0.1:18731/api/v1";
  // #endif
  if (
    !base ||
    (!base.startsWith("https://") &&
      base !== "/api/v1" &&
      !(
        import.meta.env?.DEV &&
        /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/api\/v1$/.test(base)
      ))
  ) {
    throw new ApiError(
      503,
      "API_NOT_CONFIGURED",
      "账号服务尚未配置，请继续使用游客工具",
    );
  }
  return base.replace(/\/$/, "");
}
export function decodeResponse(status: number, data: unknown): unknown {
  const body = data as {
    code?: string;
    data?: unknown;
    message?: string;
    requestId?: string;
  } | null;
  if (status >= 200 && status < 300 && body?.code === "OK") return body.data;
  throw new ApiError(
    status,
    body?.code || "SERVICE_ERROR",
    body?.message || "服务暂不可用，请稍后重试",
    body?.requestId,
  );
}
export function request<T>(
  path: string,
  method: "GET" | "POST" | "DELETE" = "GET",
  data?: unknown,
  token?: string,
): Promise<T> {
  const url = apiBase() + path;
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method,
      data: data as object,
      timeout: 12000,
      header: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success(result) {
        try {
          resolve(decodeResponse(result.statusCode, result.data) as T);
        } catch (error) {
          reject(error);
        }
      },
      fail() {
        reject(
          new ApiError(0, "NETWORK_ERROR", "网络连接失败，请检查网络后重试"),
        );
      },
    });
  });
}
export function uploadProfile(
  token: string,
  path: string,
  fields: Record<string, string>,
): Promise<import("../types/account").Account> {
  const url = apiBase() + "/me/profile";
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url,
      filePath: path,
      name: "avatar",
      formData: fields,
      timeout: 20000,
      header: { Authorization: `Bearer ${token}` },
      success(result) {
        try {
          resolve(
            decodeResponse(
              result.statusCode,
              JSON.parse(result.data),
            ) as import("../types/account").Account,
          );
        } catch (error) {
          reject(
            error instanceof ApiError
              ? error
              : new ApiError(
                  502,
                  "INVALID_RESPONSE",
                  "服务响应异常，请重新加载资料确认",
                ),
          );
        }
      },
      fail() {
        reject(
          new ApiError(
            0,
            "NETWORK_ERROR",
            "头像上传未确认，请重新加载资料后重试",
          ),
        );
      },
    });
  });
}
/** 微信image组件不能附Bearer，先鉴权下载到临时文件；凭据永不放URL。 */
export function downloadAvatar(token: string): Promise<string> {
  const url = apiBase() + "/me/avatar";
  return new Promise((resolve, reject) => {
    uni.downloadFile({
      url,
      timeout: 12000,
      header: { Authorization: `Bearer ${token}` },
      success(result) {
        if (result.statusCode === 200) resolve(result.tempFilePath);
        else
          reject(
            new ApiError(
              result.statusCode,
              "AVATAR_DOWNLOAD_FAILED",
              "头像加载失败，可重新加载",
            ),
          );
      },
      fail() {
        reject(new ApiError(0, "NETWORK_ERROR", "头像加载失败，可重新加载"));
      },
    });
  });
}
