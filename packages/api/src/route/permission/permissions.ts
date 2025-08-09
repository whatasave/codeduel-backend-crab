import type { Permission } from './data';

export class Permissions implements Iterable<Permission> {
  private readonly permissionMap = new Map<string, Permission>();
  private readonly resourceMap = new Map<string, Permission[]>();

  constructor(private readonly permissions: Permission[]) {
    for (const permission of permissions) {
      const key = this.getPermissionKey(permission.name, permission.resource);
      this.permissionMap.set(key, permission);
      if (permission.resource) {
        const resources = this.resourceMap.get(permission.resource) ?? [];
        resources.push(permission);
        this.resourceMap.set(permission.resource, resources);
      }
    }
  }

  has(name: string, resource?: string): boolean {
    const key = this.getPermissionKey(name, resource);
    return this.permissionMap.has(key);
  }

  hasAny(permissionChecks: { name: string; resource?: string }[]): boolean {
    return permissionChecks.some((check) => this.has(check.name, check.resource));
  }

  hasAll(permissionChecks: { name: string; resource?: string }[]): boolean {
    return permissionChecks.every((check) => this.has(check.name, check.resource));
  }

  getForResource(resource?: string): Permission[] {
    return this.resourceMap.get(resource ?? '') ?? [];
  }

  getResources(): string[] {
    return Array.from(this.resourceMap.keys());
  }

  toArray(): Permission[] {
    return [...this.permissions];
  }

  private getPermissionKey(name: string, resource?: string): string {
    return resource ? `${resource}:${name}` : name;
  }

  [Symbol.iterator](): Iterator<Permission> {
    return this.permissions[Symbol.iterator]();
  }
}
