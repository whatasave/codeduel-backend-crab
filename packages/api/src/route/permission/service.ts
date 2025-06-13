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
}
