import { type Database, type Select } from '@codeduel-backend-crab/database';
import type { Permission } from './data';

export class PermissionRepository {
  constructor(private readonly database: Database) {}

  async byUserId(userId: number): Promise<Permission[]> {
    const rolePermissions = this.database
      .selectFrom('user_role')
      .innerJoin('role_permission', 'role_permission.role_id', 'user_role.role_id')
      .leftJoin('user_permission', (join) =>
        join
          .onRef('user_permission.permission_id', '=', 'role_permission.permission_id')
          .on('user_permission.user_id', '=', userId)
      )
      .innerJoin('permission', 'permission.id', 'role_permission.permission_id')
      .where('user_role.user_id', '=', userId)
      .where('user_permission.allow', '=', null)
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
      .where('user_permission.allow', '=', true)
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

  async assignRole(userId: number, role: string): Promise<number> {
    const { id: roleId } = await this.database
      .selectFrom('role')
      .where('name', '=', role)
      .select('id')
      .executeTakeFirstOrThrow();

    await this.database
      .insertInto('user_role')
      .values({ user_id: userId, role_id: roleId })
      .onConflict((oc) => oc.column('user_id').doUpdateSet({ role_id: roleId }))
      .execute();

    return roleId;
  }

  async rolePermissions(roleId: number): Promise<Permission[]> {
    const permissions = await this.database
      .selectFrom('role_permission')
      .innerJoin('permission', 'permission.id', 'role_permission.permission_id')
      .where('role_permission.role_id', '=', roleId)
      .select([
        'permission.id',
        'permission.resource',
        'permission.name',
        'permission.created_at',
        'permission.updated_at',
      ])
      .execute();
    return permissions.map((permission) => PermissionRepository.selectToPermission(permission));
  }

  static selectToPermission(permission: Select<'permission'>): Permission {
    return {
      id: permission.id,
      resource: permission.resource ?? undefined,
      name: permission.name,
      createdAt: permission.created_at,
      updatedAt: permission.updated_at,
    };
  }
}
