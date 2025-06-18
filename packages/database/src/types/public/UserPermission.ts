import type { UserId } from './User';
import type { PermissionId } from './Permission';
import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

/** Represents the table public.user_permission */
export default interface UserPermissionTable {
  user_id: ColumnType<UserId, UserId, UserId>;

  permission_id: ColumnType<PermissionId, PermissionId, PermissionId>;

  allow: ColumnType<boolean, boolean, boolean>;

  updated_at: ColumnType<string, string | undefined, string>;
}

export type UserPermission = Selectable<UserPermissionTable>;

export type NewUserPermission = Insertable<UserPermissionTable>;

export type UserPermissionUpdate = Updateable<UserPermissionTable>;