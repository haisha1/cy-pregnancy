import type { SavedSession } from "../types/account";

/** 本地缓存不可信，过期/损坏时安静回到游客，不在工具页强制弹登录。 */
export function validSession(
  value: unknown,
  now = Date.now(),
): value is SavedSession {
  const session = value as SavedSession | null;
  return (
    !!session &&
    session.version === 1 &&
    typeof session.tokens?.accessToken === "string" &&
    session.tokens.accessToken.length > 0 &&
    typeof session.tokens.refreshToken === "string" &&
    session.tokens.refreshToken.length > 0 &&
    session.tokens.tokenType === "Bearer" &&
    Number.isFinite(session.accessExpiresAt) &&
    Date.parse(session.tokens.refreshExpiresAt) > now &&
    typeof session.account?.userId === "string" &&
    session.account.userId.length > 0 &&
    session.account.accountStatus === "active" &&
    Number.isSafeInteger(session.account.profileRevision)
  );
}
export function nicknameError(value: string): string {
  if (value.length > 32) return "昵称最多32个字符";
  if (/[\u0000-\u001f\u007f-\u009f]/.test(value))
    return "昵称不能包含换行或控制字符";
  return "";
}
