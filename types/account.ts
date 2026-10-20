/** 登录资料与孕期档案分别建模；后者仍仅保存本机。 */
export interface Account {
  userId: string;
  accountStatus: "active";
  cloudDataEpoch: number;
  cloudSyncEnabled: boolean;
  nickname: string | null;
  hasAvatar: boolean;
  profileRevision: number;
}
export interface Tokens {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  refreshExpiresAt: string;
}
export interface SavedSession {
  version: 1;
  tokens: Tokens;
  accessExpiresAt: number;
  account: Account;
}
