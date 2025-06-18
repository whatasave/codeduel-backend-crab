import type { RoleId } from './Role';
import type { PermissionId } from './Permission';
import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

/** Represents the table public.role_permission */
export default interface RolePermissionTable {
  role_id: ColumnType<RoleId, RoleId, RoleId>;

  permission_id: ColumnType<PermissionId, PermissionId, PermissionId>;

  updated_at: ColumnType<string, string | undefined, string>;
}

export type RolePermission = Selectable<RolePermissionTable>;

export type NewRolePermission = Insertable<RolePermissionTable>;

export type RolePermissionUpdate = Updateable<RolePermissionTable>;