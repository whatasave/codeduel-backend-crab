import type { AuthSessionId } from './AuthSession';
import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

export type AuthUsedRefreshTokenTokenId = string;

/** Represents the table public.auth_used_refresh_token */
export default interface AuthUsedRefreshTokenTable {
  token_id: ColumnType<AuthUsedRefreshTokenTokenId, AuthUsedRefreshTokenTokenId, AuthUsedRefreshTokenTokenId>;

  session_id: ColumnType<AuthSessionId, AuthSessionId, AuthSessionId>;

  expires_at: ColumnType<string, string, string>;

  used_at: ColumnType<string, string | undefined, string>;
}

export type AuthUsedRefreshToken = Selectable<AuthUsedRefreshTokenTable>;

export type NewAuthUsedRefreshToken = Insertable<AuthUsedRefreshTokenTable>;

export type AuthUsedRefreshTokenUpdate = Updateable<AuthUsedRefreshTokenTable>;