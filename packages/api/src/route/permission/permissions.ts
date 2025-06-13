import type { Permission } from './data';

export class Permissions implements Iterable<Permission> {
  constructor(private readonly permissions: Permission[]) {}

  has(resource: string | undefined, name: string): boolean {
    return this.permissions.some(
      (permission) => permission.resource === resource && permission.name === name
    );
  }

  ids(): number[] {
    return this.permissions.map((permission) => permission.id);
  }

  [Symbol.iterator](): Iterator<Permission> {
    return this.permissions[Symbol.iterator]();
  }
}
