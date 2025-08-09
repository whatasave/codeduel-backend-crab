import type { Permission } from './data';
import type { PermissionRepository } from './repository';

export class PermissionService {
  constructor(private readonly repository: PermissionRepository) {}

  async byUserId(userId: number): Promise<Permission[]> {
    return await this.repository.byUserId(userId);
  }

  async byIds(ids: number[]): Promise<Permission[]> {
    return await this.repository.byIds(ids);
  }

  async createPermission(name: string, resource?: string): Promise<Permission> {
    return await this.repository.createPermission(name, resource);
  }

  async grantPermissionToUser(userId: number, permissionId: number): Promise<void> {
    await this.repository.grantPermissionToUser(userId, permissionId);
  }

  async revokePermissionFromUser(userId: number, permissionId: number): Promise<void> {
    await this.repository.revokePermissionFromUser(userId, permissionId);
  }

  async removeUserPermissionOverride(userId: number, permissionId: number): Promise<void> {
    await this.repository.removeUserPermissionOverride(userId, permissionId);
  }

  async getPermissionsByResource(resource?: string): Promise<Permission[]> {
    return await this.repository.getPermissionsByResource(resource);
  }

  async getUserRole(userId: number): Promise<{ id: number; name: string } | null> {
    return await this.repository.getUserRole(userId);
  }

  async assignRole(userId: number, role: string): Promise<number> {
    const roleId = await this.repository.assignRole(userId, role);
    return roleId;
  }

  async userHasPermission(userId: number, name: string, resource?: string): Promise<boolean> {
    const permissions = await this.byUserId(userId);
    return permissions.some((p) => p.name === name && p.resource === resource);
  }
}
