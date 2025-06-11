import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

export type PermissionId = number;

/** Represents the table public.permission */
export default interface PermissionTable {
  id: ColumnType<PermissionId, PermissionId | undefined, PermissionId>;

  resource: ColumnType<string | null, string | null, string | null>;

  name: ColumnType<string, string, string>;

  created_at: ColumnType<string, string | undefined, string>;

  updated_at: ColumnType<string, string | undefined, string>;
}

export type Permission = Selectable<PermissionTable>;

export type NewPermission = Insertable<PermissionTable>;

export type PermissionUpdate = Updateable<PermissionTable>;