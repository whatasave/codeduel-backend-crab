import type { UserId } from './User';
import type { RoleId } from './Role';
import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

/** Represents the table public.user_role */
export default interface UserRoleTable {
  user_id: ColumnType<UserId, UserId, UserId>;

  role_id: ColumnType<RoleId, RoleId, RoleId>;

  updated_at: ColumnType<string, string | undefined, string>;
}

export type UserRole = Selectable<UserRoleTable>;

export type NewUserRole = Insertable<UserRoleTable>;

export type UserRoleUpdate = Updateable<UserRoleTable>;