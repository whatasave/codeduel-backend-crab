import type { User } from '../user/data';
import type { Permission, Role } from './data';
import type { PermissionRepository } from './repository';

export class PermissionService {
  constructor(private readonly repository: PermissionRepository) {}

  async byUserId(userId: User['id']): Promise<Permission[]> {
    return await this.repository.byUserId(userId);
  }

  async byIds(ids: Permission['id'][]): Promise<Permission[]> {
    return await this.repository.byIds(ids);
  }

  async byResource(resource?: string): Promise<Permission[]> {
    return await this.repository.byResource(resource);
  }

  async create(name: string, resource: string): Promise<Permission> {
    return await this.repository.createPermission(name, resource);
  }

  async grantPermissionToUser(userId: User['id'], permissionId: Permission['id']): Promise<void> {
    await this.repository.grantPermissionToUser(userId, permissionId);
  }

  async revokePermissionFromUser(
    userId: User['id'],
    permissionId: Permission['id']
  ): Promise<void> {
    await this.repository.revokePermissionFromUser(userId, permissionId);
  }

  async removeUserPermissionOverride(
    userId: User['id'],
    permissionId: Permission['id']
  ): Promise<void> {
    await this.repository.removeUserPermissionOverride(userId, permissionId);
  }

  async getRoleByName(roleName: Role['name']): Promise<Role | undefined> {
    return await this.repository.getRoleByName(roleName);
  }

  async getUserRoles(userId: User['id']): Promise<Role[]> {
    return await this.repository.getUserRoles(userId);
  }

  async assignRole(userId: User['id'], roleId: Role['id']): Promise<boolean> {
    return await this.repository.assignRole(userId, roleId);
  }

  async revokeRole(userId: User['id'], roleId: Role['id']): Promise<boolean> {
    return await this.repository.revokeRole(userId, roleId);
  }

  async userHasPermission(userId: User['id'], name: string, resource?: string): Promise<boolean> {
    const permissions = await this.byUserId(userId);
    return permissions.some((p) => p.name === name && p.resource === resource);
  }
}
