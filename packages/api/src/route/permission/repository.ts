import { type Database, type Select } from '@codeduel-backend-crab/database';
import type { User } from '../user/data';
import type { Permission, Role } from './data';

export class PermissionRepository {
  constructor(private readonly database: Database) {}

  async byIds(ids: Permission['id'][]): Promise<Permission[]> {
    if (ids.length === 0) return [];

    const permissions = await this.database
      .selectFrom('permission')
      .where('id', 'in', ids)
      .select(['id', 'resource', 'name', 'created_at', 'updated_at'])
      .execute();

    return permissions.map((permission) => PermissionRepository.selectToPermission(permission));
  }

  async byUserId(userId: User['id']): Promise<Permission[]> {
    // SELECT ur.user_id, r."name", p.resource, p."name", up.allow
    // FROM user_role ur
    // INNER JOIN role_permission rp ON ur.role_id = rp.role_id
    // LEFT JOIN user_permission up ON up.user_id = 1 AND up.permission_id = rp.permission_id
    // INNER JOIN permission p ON rp.permission_id = p.id
    // INNER JOIN role r ON ur.role_id = r.id
    // WHERE ur.user_id = 1 AND up.allow IS NOT FALSE
    // ORDER BY rp.permission_id
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
      .where('user_permission.allow', 'is', null)
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

  async byResource(resource?: string): Promise<Permission[]> {
    let query = this.database.selectFrom('permission').selectAll();

    if (resource === undefined) {
      query = query.where('resource', 'is', null);
    } else {
      query = query.where('resource', '=', resource);
    }

    const permissions = await query.execute();
    return permissions.map((permission) => PermissionRepository.selectToPermission(permission));
  }

  async assignRole(userId: User['id'], roleId: Role['id']): Promise<boolean> {
    const result = await this.database
      .insertInto('user_role')
      .values({ user_id: userId, role_id: roleId })
      .onConflict((oc) => oc.columns(['user_id', 'role_id']).doNothing())
      .executeTakeFirst();

    return (result.numInsertedOrUpdatedRows ?? 0n) > 0n;
  }

  async revokeRole(userId: User['id'], roleId: Role['id']): Promise<boolean> {
    const result = await this.database
      .deleteFrom('user_role')
      .where('user_id', '=', userId)
      .where('role_id', '=', roleId)
      .executeTakeFirst();

    return result.numDeletedRows > 0n;
  }

  async rolePermissions(roleId: Role['id']): Promise<Permission[]> {
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

  async createPermission(name: string, resource: string): Promise<Permission> {
    const permission = await this.database
      .insertInto('permission')
      .values({ name, resource })
      .returningAll()
      .executeTakeFirstOrThrow();

    return PermissionRepository.selectToPermission(permission);
  }

  async grantPermissionToUser(userId: User['id'], permissionId: Permission['id']): Promise<void> {
    await this.database
      .insertInto('user_permission')
      .values({ user_id: userId, permission_id: permissionId, allow: true })
      .onConflict((oc) => oc.columns(['user_id', 'permission_id']).doUpdateSet({ allow: true }))
      .execute();
  }

  async revokePermissionFromUser(
    userId: User['id'],
    permissionId: Permission['id']
  ): Promise<void> {
    await this.database
      .insertInto('user_permission')
      .values({ user_id: userId, permission_id: permissionId, allow: false })
      .onConflict((oc) => oc.columns(['user_id', 'permission_id']).doUpdateSet({ allow: false }))
      .execute();
  }

  async removeUserPermissionOverride(
    userId: User['id'],
    permissionId: Permission['id']
  ): Promise<void> {
    await this.database
      .deleteFrom('user_permission')
      .where('user_id', '=', userId)
      .where('permission_id', '=', permissionId)
      .execute();
  }

  async getUserRoles(userId: User['id']): Promise<Role[]> {
    return await this.database
      .selectFrom('user_role')
      .innerJoin('role', 'role.id', 'user_role.role_id')
      .where('user_role.user_id', '=', userId)
      .select(['role.id', 'role.name'])
      .orderBy('role.id')
      .execute();
  }

  async permissionExists(name: string, resource?: string): Promise<boolean> {
    let query = this.database.selectFrom('permission').where('name', '=', name);

    if (resource === undefined) {
      query = query.where('resource', 'is', null);
    } else {
      query = query.where('resource', '=', resource);
    }

    const result = await query.select('id').executeTakeFirst();
    return !!result;
  }

  static selectToPermission(permission: Select<'permission'>): Permission {
    return {
      id: permission.id,
      resource: permission.resource,
      name: permission.name,
      createdAt: permission.created_at,
      updatedAt: permission.updated_at,
    };
  }
}
