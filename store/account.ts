import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
  apiBase,
  ApiError,
  downloadAvatar,
  request,
  uploadProfile,
} from "../api/http";
import { wechatCode } from "../api/wechat";
import type { Account, SavedSession, Tokens } from "../types/account";
import { readStored, writeStored } from "../utils/storage";
import { validSession, nicknameError } from "../utils/account";
import { uuid } from "../utils/uuid";
const SESSION_KEY = "cy:account:v1";
const INSTALL_KEY = "cy:installation:v1";

/** setup store是跨页面的单一账号状态。凭据与本地健康档案分区，不进入导出、日志或分享。 */
export const useAccountStore = defineStore("account", () => {
  const session = ref<SavedSession | null>(null);
  const busy = ref(false),
    checking = ref(false),
    error = ref(""),
    avatarPath = ref("");
  const authenticated = computed(() => !!session.value);
  const account = computed(() => session.value?.account ?? null);
  let hydrated = false,
    generation = 0;
  let refreshFlight: Promise<void> | null = null,
    checkFlight: Promise<void> | null = null;
  function forget() {
    generation++;
    session.value = null;
    avatarPath.value = "";
    try {
      uni.removeStorageSync(SESSION_KEY);
    } catch {
      error.value = "登录缓存清理失败，请在微信设置中清理小程序缓存";
    }
  }
  function hydrate() {
    if (hydrated) return;
    hydrated = true;
    try {
      const saved = readStored(SESSION_KEY);
      if (validSession(saved)) session.value = saved;
      else if (saved) forget();
    } catch {
      forget();
    }
    // 恢复只读缓存，不联网，也不弹登录；进入档案再验证会话。
  }
  function persist(next: SavedSession) {
    try {
      writeStored(SESSION_KEY, next);
      session.value = next;
    } catch {
      forget();
      throw new ApiError(
        0,
        "SESSION_STORAGE_FAILED",
        "无法保存登录状态，请检查设备存储后重新登录",
      );
    }
  }
  async function refresh() {
    if (refreshFlight) return refreshFlight;
    const current = session.value,
      epoch = generation;
    if (!current)
      throw new ApiError(401, "AUTH_EXPIRED", "登录已过期，请在档案页重新登录");
    refreshFlight = (async () => {
      try {
        const tokens = await request<Tokens>("/auth/refresh", "POST", {
          refreshToken: current.tokens.refreshToken,
        });
        if (epoch !== generation)
          throw new ApiError(401, "AUTH_EXPIRED", "登录状态已变化");
        // 轮换成功后必须先保存新凭据；网络中断时旧token是否已使用无法判断，不能自动重放。
        persist({
          ...current,
          tokens,
          accessExpiresAt: Date.now() + tokens.expiresIn * 1000,
        });
      } catch (cause) {
        if (epoch === generation) forget();
        throw cause;
      }
    })().finally(() => {
      refreshFlight = null;
    });
    return refreshFlight;
  }
  async function accessToken() {
    if (!session.value)
      throw new ApiError(401, "AUTH_EXPIRED", "请在档案页登录后继续");
    if (session.value.accessExpiresAt <= Date.now() + 30000) await refresh();
    if (!session.value) throw new ApiError(401, "AUTH_EXPIRED", "登录已过期");
    return session.value.tokens.accessToken;
  }
  async function authorized<T>(
    path: string,
    method: "GET" | "POST" | "DELETE" = "GET",
    data?: unknown,
  ): Promise<T> {
    const token = await accessToken();
    try {
      return await request<T>(path, method, data, token);
    } catch (cause) {
      if (!(cause instanceof ApiError) || cause.status !== 401) throw cause;
      // 只对明确401刷新一次；不对上传和网络不确定写入自动重试。
      if (session.value?.tokens.accessToken === token) await refresh();
      try {
        return await request<T>(path, method, data, await accessToken());
      } catch (retry) {
        if (retry instanceof ApiError && retry.status === 401) forget();
        throw retry;
      }
    }
  }
  function rememberAccount(value: Account) {
    if (session.value) persist({ ...session.value, account: value });
  }
  async function loadMe() {
    const epoch = generation;
    const value = await authorized<Account>("/me");
    if (epoch === generation) rememberAccount(value);
  }
  async function verify() {
    if (!session.value) return;
    if (checkFlight) return checkFlight;
    checking.value = true;
    error.value = "";
    checkFlight = loadMe()
      .catch((cause) => {
        error.value = message(cause);
      })
      .finally(() => {
        checking.value = false;
        checkFlight = null;
      });
    return checkFlight;
  }
  async function login() {
    if (busy.value) return;
    busy.value = true;
    error.value = "";
    const epoch = ++generation;
    let issued: Tokens | null = null;
    try {
      apiBase();
      const capabilities = await request<{ auth: boolean }>("/capabilities");
      if (!capabilities.auth)
        throw new ApiError(
          503,
          "WECHAT_NOT_CONFIGURED",
          "微信登录尚未配置，可继续使用游客工具",
        );
      let installation = readStored(INSTALL_KEY);
      if (
        typeof installation !== "string" ||
        !/^[A-Za-z0-9_-]{16,64}$/.test(installation)
      ) {
        installation = uuid();
        writeStored(INSTALL_KEY, installation);
      }
      const code = await wechatCode();
      issued = await request<Tokens>("/auth/wx-login", "POST", {
        code,
        installationId: installation,
      });
      const me = await request<Account>(
        "/me",
        "GET",
        undefined,
        issued.accessToken,
      );
      if (epoch !== generation) return;
      persist({
        version: 1,
        tokens: issued,
        accessExpiresAt: Date.now() + issued.expiresIn * 1000,
        account: me,
      });
    } catch (cause) {
      if (issued) {
        try {
          await request("/auth/logout", "POST", undefined, issued.accessToken);
        } catch {}
      }
      error.value = message(cause);
    } finally {
      busy.value = false;
    }
  }
  async function loadAvatar() {
    const epoch = generation;
    if (!account.value?.hasAvatar) {
      avatarPath.value = "";
      return;
    }
    const path = await downloadAvatar(await accessToken());
    if (epoch === generation) avatarPath.value = path;
  }
  async function saveProfile(nickname: string, image = "") {
    if (busy.value || !account.value) return false;
    const invalid = nicknameError(nickname);
    if (invalid) {
      error.value = invalid;
      return false;
    }
    busy.value = true;
    error.value = "";
    const epoch = generation;
    try {
      const token = await accessToken(),
        wxCode = await wechatCode();
      const revision = account.value!.profileRevision;
      const next = image
        ? await uploadProfile(token, image, {
            nickname: nickname.trim(),
            wxCode,
            revision: String(revision),
          })
        : await request<Account>(
            "/me/profile",
            "POST",
            { nickname: nickname.trim(), wxCode, revision },
            token,
          );
      if (epoch !== generation) return false;
      rememberAccount(next);
      avatarPath.value = "";
      return true;
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) forget();
      error.value = message(cause);
      return false;
    } finally {
      busy.value = false;
    }
  }
  async function clearProfile() {
    const next = await authorized<Account>(
      "/me/profile?revision=" + account.value!.profileRevision,
      "DELETE",
    );
    rememberAccount(next);
    avatarPath.value = "";
  }
  async function logout() {
    if (busy.value) return;
    busy.value = true;
    error.value = "";
    try {
      await authorized("/auth/logout", "POST");
    } catch {
      error.value = "本机已退出；服务端撤销未确认，原会话将在有效期结束后失效";
    } finally {
      forget();
      busy.value = false;
    }
  }
  function message(cause: unknown) {
    return cause instanceof ApiError ? cause.message : "操作未完成，请稍后重试";
  }
  return {
    authenticated,
    account,
    busy,
    checking,
    error,
    avatarPath,
    hydrate,
    login,
    verify,
    loadAvatar,
    saveProfile,
    clearProfile,
    logout,
  };
});
