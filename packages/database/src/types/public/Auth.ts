import type { UserId } from './User';
import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

/** Represents the table public.auth */
export default interface AuthTable {
  user_id: ColumnType<UserId, UserId | undefined, UserId>;

  provider: ColumnType<string, string, string>;

  provider_id: ColumnType<number, number, number>;

  created_at: ColumnType<string, string | undefined, string>;

  updated_at: ColumnType<string, string | undefined, string>;
}

export type Auth = Selectable<AuthTable>;

export type NewAuth = Insertable<AuthTable>;

export type AuthUpdate = Updateable<AuthTable>;