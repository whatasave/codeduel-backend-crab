import type { UserId } from './User';
import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

export type AuthSessionId = number;

/** Represents the table public.auth_session */
export default interface AuthSessionTable {
  id: ColumnType<AuthSessionId, AuthSessionId | undefined, AuthSessionId>;

  user_id: ColumnType<UserId, UserId | undefined, UserId>;

  token_id: ColumnType<string | null, string | null, string | null>;

  ip: ColumnType<string | null, string | null, string | null>;

  user_agent: ColumnType<string | null, string | null, string | null>;

  provider: ColumnType<string, string, string>;

  created_at: ColumnType<string, string | undefined, string>;

  updated_at: ColumnType<string, string | undefined, string>;
}

export type AuthSession = Selectable<AuthSessionTable>;

export type NewAuthSession = Insertable<AuthSessionTable>;

export type AuthSessionUpdate = Updateable<AuthSessionTable>;