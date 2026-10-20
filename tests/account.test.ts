import test from "node:test";
import assert from "node:assert/strict";
import { validSession, nicknameError } from "../utils/account";
import { createPinia, setActivePinia } from "pinia";
import { useAccountStore } from "../store/account";
const now = Date.now();
const session = () => ({
  version: 1,
  account: { userId: "test-uuid", accountStatus: "active", profileRevision: 0 },
  tokens: {
    accessToken: "test-access",
    refreshToken: "test-refresh",
    tokenType: "Bearer",
    refreshExpiresAt: new Date(now + 3600000).toISOString(),
  },
  accessExpiresAt: now + 900000,
});
test("会话缓存需要完整且未过期，不能把任意缓存认作登录", () => {
  assert.equal(validSession(session(), now), true);
  assert.equal(validSession({}, now), false);
  assert.equal(
    validSession(
      {
        ...session(),
        tokens: { ...session().tokens, refreshExpiresAt: "invalid" },
      },
      now,
    ),
    false,
  );
  assert.equal(validSession(session(), now + 7200000), false);
});
test("昵称允许空值和中文，拒绝控制字符和超长", () => {
  assert.equal(nicknameError(""), "");
  assert.equal(nicknameError("春雨🌧"), "");
  assert.ok(nicknameError("x\nname"));
  assert.ok(nicknameError("春".repeat(33)));
});
test("启动恢复账号不触发登录或联网，损坏缓存安静降为游客", () => {
  const memory = new Map<string, string>();
  let requests = 0;
  Object.assign(globalThis, {
    uni: {
      getStorageSync: (key: string) => memory.get(key) || "",
      setStorageSync: (key: string, value: string) => memory.set(key, value),
      removeStorageSync: (key: string) => memory.delete(key),
      request: () => requests++,
      login: () => requests++,
    },
  });
  setActivePinia(createPinia());
  const guest = useAccountStore();
  guest.hydrate();
  assert.equal(guest.authenticated, false);
  assert.equal(requests, 0);
  memory.set("cy:account:v1", JSON.stringify(session()));
  setActivePinia(createPinia());
  const logged = useAccountStore();
  logged.hydrate();
  assert.equal(logged.authenticated, true);
  assert.equal(requests, 0);
  memory.set("cy:account:v1", "{broken");
  setActivePinia(createPinia());
  const broken = useAccountStore();
  broken.hydrate();
  assert.equal(broken.authenticated, false);
  assert.equal(memory.has("cy:account:v1"), false);
  assert.equal(requests, 0);
});

test("过期access仅串行刷新一次，新的refresh凭据持久化后再访问资料", async () => {
  const memory = new Map<string, string>([
    ["cy:account:v1", JSON.stringify({ ...session(), accessExpiresAt: 0 })],
  ]);
  let refreshCalls = 0,
    meCalls = 0;
  Object.assign(globalThis, {
    uni: {
      getStorageSync: (key: string) => memory.get(key) || "",
      setStorageSync: (key: string, value: string) => memory.set(key, value),
      removeStorageSync: (key: string) => memory.delete(key),
      request: (options: any) => {
        queueMicrotask(() => {
          if (options.url.endsWith("/auth/refresh")) {
            refreshCalls++;
            options.success({
              statusCode: 200,
              data: {
                code: "OK",
                data: {
                  ...session().tokens,
                  accessToken: "rotated-access",
                  refreshToken: "rotated-refresh",
                  expiresIn: 900,
                },
              },
            });
          } else {
            meCalls++;
            assert.equal(options.header.Authorization, "Bearer rotated-access");
            options.success({
              statusCode: 200,
              data: { code: "OK", data: session().account },
            });
          }
        });
      },
    },
  });
  setActivePinia(createPinia());
  const account = useAccountStore();
  account.hydrate();
  await Promise.all([account.verify(), account.verify()]);
  assert.equal(refreshCalls, 1);
  assert.equal(meCalls, 1);
  assert.equal(
    JSON.parse(memory.get("cy:account:v1")!).tokens.refreshToken,
    "rotated-refresh",
  );
});

test("refresh响应丢失不重放旧凭据，降回游客且不清健康记录", async () => {
  const memory = new Map<string, string>([
    ["cy:account:v1", JSON.stringify({ ...session(), accessExpiresAt: 0 })],
    ["cy:profile:v1", "health-records"],
  ]);
  let requests = 0;
  Object.assign(globalThis, {
    uni: {
      getStorageSync: (key: string) => memory.get(key) || "",
      setStorageSync: (key: string, value: string) => memory.set(key, value),
      removeStorageSync: (key: string) => memory.delete(key),
      request: (options: any) => {
        requests++;
        options.fail();
      },
    },
  });
  setActivePinia(createPinia());
  const account = useAccountStore();
  account.hydrate();
  await account.verify();
  assert.equal(requests, 1);
  assert.equal(account.authenticated, false);
  assert.equal(memory.has("cy:account:v1"), false);
  assert.equal(memory.get("cy:profile:v1"), "health-records");
});

test("显式登录才调用微信，服务端确认资料后保存会话", async () => {
  const memory = new Map<string, string>();
  const calls: string[] = [];
  Object.assign(globalThis, {
    uni: {
      getStorageSync: (key: string) => memory.get(key) || "",
      setStorageSync: (key: string, value: string) => memory.set(key, value),
      removeStorageSync: (key: string) => memory.delete(key),
      login: (options: any) => {
        calls.push("wx.login");
        options.success({ code: "one-time-code" });
      },
      request: (options: any) => {
        const path = options.url.replace("/api/v1", "");
        calls.push(path);
        if (path === "/auth/wx-login") {
          assert.equal(options.data.code, "one-time-code");
          assert.match(options.data.installationId, /^[A-Za-z0-9_-]{16,64}$/);
        }
        options.success({
          statusCode: 200,
          data: {
            code: "OK",
            data:
              path === "/capabilities"
                ? { auth: true }
                : path === "/me"
                  ? session().account
                  : { ...session().tokens, expiresIn: 900 },
          },
        });
      },
    },
  });
  setActivePinia(createPinia());
  const account = useAccountStore();
  account.hydrate();
  assert.deepEqual(calls, []);
  await account.login();
  assert.deepEqual(calls, [
    "/capabilities",
    "wx.login",
    "/auth/wx-login",
    "/me",
  ]);
  assert.equal(account.authenticated, true);
  assert.equal(account.busy, false);
  assert.equal(memory.has("cy:account:v1"), true);
  assert.equal(memory.has("cy:profile:v1"), false);
});

test("微信登录取消不建立服务端会话，保留游客使用", async () => {
  let logins = 0;
  Object.assign(globalThis, {
    uni: {
      getStorageSync: () => "",
      setStorageSync: () => {},
      removeStorageSync: () => {},
      login: (options: any) => options.fail(),
      request: (options: any) => {
        if (options.url.endsWith("/auth/wx-login")) logins++;
        options.success({
          statusCode: 200,
          data: { code: "OK", data: { auth: true } },
        });
      },
    },
  });
  setActivePinia(createPinia());
  const account = useAccountStore();
  account.hydrate();
  await account.login();
  assert.equal(account.authenticated, false);
  assert.equal(account.busy, false);
  assert.equal(logins, 0);
  assert.match(account.error, /微信登录未完成/);
});
