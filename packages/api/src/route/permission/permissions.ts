import type { Permission } from './data';

export class Permissions implements Iterable<Permission> {
  constructor(private readonly permissions: Permission[]) {}

  has(name: string, resource?: string): boolean {
    return this.permissions.some(
      (permission) => permission.resource === resource && permission.name === name
    );
  }

  [Symbol.iterator](): Iterator<Permission> {
    return this.permissions[Symbol.iterator]();
  }
}
