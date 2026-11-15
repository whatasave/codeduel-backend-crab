import type { Logger } from '@codeduel-backend-crab/logger';
import type { User } from '../user/data';
import type { Permission, Role } from './data';
import type { PermissionRepository } from './repository';

export class PermissionService {
  constructor(private readonly repository: PermissionRepository) {}

  async byUserId(userId: User['id'], logger?: Logger): Promise<Permission[]> {
    const permissions = await this.repository.byUserId(userId);
    logger?.debug('byUserId.success', 'fetched user permissions', {
      userId,
      count: permissions.length,
    });
    return permissions;
  }

  async byIds(ids: Permission['id'][], logger?: Logger): Promise<Permission[]> {
    const permissions = await this.repository.byIds(ids);
    if (permissions.length !== new Set(ids).size) {
      logger?.warn('byIds.missing', 'some requested permissions do not exist', {
        requested: ids.length,
        found: permissions.length,
      });
    }
    return permissions;
  }

  async byResource(resource?: string): Promise<Permission[]> {
    return await this.repository.byResource(resource);
  }

  async create(name: string, resource: string, logger?: Logger): Promise<Permission> {
    const permission = await this.repository.createPermission(name, resource);
    logger?.info('create.success', 'permission created', {
      permissionId: permission.id,
      name,
      resource,
    });
    return permission;
  }

  async grantPermissionToUser(
    userId: User['id'],
    permissionId: Permission['id'],
    logger?: Logger
  ): Promise<void> {
    await this.repository.grantPermissionToUser(userId, permissionId);
    logger?.info('grantPermission.success', 'permission granted to user', {
      userId,
      permissionId,
    });
  }

  async revokePermissionFromUser(
    userId: User['id'],
    permissionId: Permission['id'],
    logger?: Logger
  ): Promise<void> {
    await this.repository.revokePermissionFromUser(userId, permissionId);
    logger?.info('revokePermission.success', 'permission revoked from user', {
      userId,
      permissionId,
    });
  }

  async removeUserPermissionOverride(
    userId: User['id'],
    permissionId: Permission['id'],
    logger?: Logger
  ): Promise<void> {
    await this.repository.removeUserPermissionOverride(userId, permissionId);
    logger?.info('removeOverride.success', 'user permission override removed', {
      userId,
      permissionId,
    });
  }

  async getRoleByName(roleName: Role['name']): Promise<Role | undefined> {
    return await this.repository.getRoleByName(roleName);
  }

  async getUserRoles(userId: User['id']): Promise<Role[]> {
    return await this.repository.getUserRoles(userId);
  }

  async assignRole(userId: User['id'], roleId: Role['id'], logger?: Logger): Promise<boolean> {
    const assigned = await this.repository.assignRole(userId, roleId);
    if (assigned) logger?.info('assignRole.success', 'role assigned to user', { userId, roleId });
    else logger?.debug('assignRole.noop', 'role not assigned', { userId, roleId });
    return assigned;
  }

  async revokeRole(userId: User['id'], roleId: Role['id'], logger?: Logger): Promise<boolean> {
    const revoked = await this.repository.revokeRole(userId, roleId);
    if (revoked) logger?.info('revokeRole.success', 'role revoked from user', { userId, roleId });
    else logger?.debug('revokeRole.noop', 'role not revoked', { userId, roleId });
    return revoked;
  }

  async userHasPermission(userId: User['id'], name: string, resource?: string): Promise<boolean> {
    const permissions = await this.byUserId(userId);
    return permissions.some((p) => p.name === name && p.resource === resource);
  }
}
