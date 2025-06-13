import { jsonArrayFrom, type Database, type Select } from '@codeduel-backend-crab/database';
import type { Permission } from './data';

export class PermissionRepository {
  constructor(private readonly database: Database) {}

  async byUserId(userId: number): Promise<Permission[]> {
    const rolePermissions = this.database
      .selectFrom('user_role')
      .innerJoin('role_permission', 'role_permission.role_id', 'user_role.role_id')
      .innerJoin('permission', 'permission.id', 'role_permission.permission_id')
      .where('user_role.user_id', '=', userId)
      .where('permission_id', 'not in', (eb) =>
        eb.selectFrom('user_permission').where('user_id', '=', userId).select('permission_id')
      )
      .select([
        'permission.id',
        'permission.resource',
        'permission.name',
        'permission.created_at',
        'permission.updated_at',
      ]);

    const extraPermissions = this.database
      .selectFrom('user_permission')
      .innerJoin('permission', 'permission.id', 'user_permission.permission_id')
      .where('user_permission.user_id', '=', userId)
      .where('permission.id', 'not in', (eb) =>
        eb
          .selectFrom('user_role')
          .innerJoin('role_permission', 'role_permission.role_id', 'user_role.role_id')
          .where('user_role.user_id', '=', userId)
          .select('role_permission.permission_id')
      )
      .select([
        'permission.id as id',
        'permission.resource as resource',
        'permission.name as name',
        'permission.created_at as created_at',
        'permission.updated_at as updated_at',
      ]);

    const permissions = await this.database
      .selectFrom(rolePermissions.union(extraPermissions).as('permission'))
      .selectAll()
      .execute();

    return permissions.map((permission) => PermissionRepository.selectToPermission(permission));
  }

  async byIds(ids: number[]): Promise<Permission[]> {
    const permissions = await this.database
      .selectFrom('permission')
      .where('id', 'in', ids)
      .select(['id', 'resource', 'name', 'created_at', 'updated_at'])
      .execute();

    return permissions.map((permission) => PermissionRepository.selectToPermission(permission));
  }

  async assignRole(userId: number, role: string): Promise<Permission[]> {
    const { id: roleId, permissions } = await this.database
      .selectFrom('role')
      .where('name', '=', role)
      .select('id')
      .select((eb) =>
        jsonArrayFrom(
          eb
            .selectFrom('role_permission')
            .innerJoin('permission', 'permission.id', 'role_permission.permission_id')
            .whereRef('role_id', '=', 'id')
            .selectAll()
        ).as('permissions')
      )
      .executeTakeFirstOrThrow();

    await this.database
      .insertInto('user_role')
      .values({ user_id: userId, role_id: roleId })
      .onConflict((oc) => oc.column('user_id').doUpdateSet({ role_id: roleId }))
      .execute();

    await this.database
      .deleteFrom('user_permission')
      .where('user_id', '=', userId)
      .where(
        'permission_id',
        'in',
        permissions.map((p) => p.id)
      )
      .execute();

    return permissions.map((permission) => PermissionRepository.selectToPermission(permission));
  }

  static selectToPermission(permission: Select<'permission'>): Permission {
    return {
      id: permission.id,
      name: permission.name,
      createdAt: permission.created_at,
      updatedAt: permission.updated_at,
    };
  }
}
