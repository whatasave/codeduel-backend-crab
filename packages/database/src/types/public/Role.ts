import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

export type RoleId = number;

/** Represents the table public.role */
export default interface RoleTable {
  id: ColumnType<RoleId, RoleId | undefined, RoleId>;

  name: ColumnType<string, string, string>;

  created_at: ColumnType<string, string | undefined, string>;

  updated_at: ColumnType<string, string | undefined, string>;
}

export type Role = Selectable<RoleTable>;

export type NewRole = Insertable<RoleTable>;

export type RoleUpdate = Updateable<RoleTable>;