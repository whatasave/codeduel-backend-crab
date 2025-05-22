import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

export type UserId = number;

/** Represents the table public.user */
export default interface UserTable {
  id: ColumnType<UserId, UserId | undefined, UserId>;

  username: ColumnType<string, string, string>;

  name: ColumnType<string | null, string | null, string | null>;

  avatar: ColumnType<string | null, string | null, string | null>;

  background_image: ColumnType<string | null, string | null, string | null>;

  biography: ColumnType<string | null, string | null, string | null>;

  created_at: ColumnType<string, string | undefined, string>;

  updated_at: ColumnType<string, string | undefined, string>;
}

export type User = Selectable<UserTable>;

export type NewUser = Insertable<UserTable>;

export type UserUpdate = Updateable<UserTable>;