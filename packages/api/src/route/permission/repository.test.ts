import { afterEach, beforeEach, describe, expect, jest, test } from 'bun:test';
import type { Database } from '@codeduel-backend-crab/database';
import { setupTestDatabase } from '../../utils/test';
import { PermissionRepository } from './repository';
import type { Permission } from './data';

describe('Route.Permission.Repository', () => {
  let db: Database;
  let repository: PermissionRepository;
  let userRoleId: number;
  let mockPermissions: Permission[];

  beforeEach(async () => {
    db = await setupTestDatabase();
    repository = new PermissionRepository(db);

    await db.transaction().execute(async (tx) => {
      mockPermissions = await tx
        .insertInto('permission')
        .values([
          {
            name: 'create',
            resource: 'challenge',
          },
          {
            name: 'login',
            resource: 'auth',
          },
          {
            name: 'view',
            resource: 'challenge',
          },
        ])
        .returningAll()
        .execute()
        .then((rows) =>
          rows.map((row) => ({
            id: row.id,
            resource: row.resource,
            name: row.name,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }))
        );

      const [create, login] = mockPermissions;
      if (!create || !login) {
        throw new Error('Failed to insert mock permissions');
      }

      userRoleId = await tx
        .insertInto('role')
        .values({ name: 'user' })
        .returning('id')
        .executeTakeFirstOrThrow()
        .then((row) => row.id);

      await tx
        .insertInto('role_permission')
        .values([
          { role_id: userRoleId, permission_id: create.id },
          { role_id: userRoleId, permission_id: login.id },
        ])
        .execute();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('byUserId', () => {
    let userId: number;

    beforeEach(async () => {
      userId = await db
        .insertInto('user')
        .values({ username: 'user' })
        .returning('id')
        .executeTakeFirstOrThrow()
        .then((row) => row.id);
    });

    test('should return permissions for a user with role', async () => {
      const [create, login, view] = mockPermissions;
      if (!create || !login || !view) {
        throw new Error('Mock permissions are not set up correctly');
      }

      await db
        .insertInto('user_role')
        .values({ role_id: userRoleId, user_id: userId })
        .returningAll()
        .executeTakeFirstOrThrow();

      const permissions = await repository.byUserId(userId);

      expect(permissions).toEqual([create, login]);
    });

    test('should return empty array for a user without role', async () => {
      const permissions = await repository.byUserId(userId);

      expect(permissions).toEqual([]);
    });

    test('should return correct permission with overrides', async () => {
      const [create, login, view] = mockPermissions;
      if (!create || !login || !view) {
        throw new Error('Mock permissions are not set up correctly');
      }

      await db.transaction().execute(async (tx) => {
        await tx.insertInto('user_role').values({ role_id: userId, user_id: userId }).execute();

        await tx
          .insertInto('user_permission')
          .values([
            {
              user_id: userId,
              permission_id: login.id,
              allow: false,
            },
            {
              user_id: userId,
              permission_id: view.id,
              allow: true,
            },
          ])
          .execute();
      });

      const permissions = await repository.byUserId(userId);

      expect(permissions).toEqual([create, view]);
    });
  });

  describe('byIds', () => {
    test('should return permissions by IDs', async () => {
      const [create, login] = mockPermissions;
      if (!create || !login) {
        throw new Error('Mock permissions are not set up correctly');
      }

      const permissions = await repository.byIds([create.id, login.id]);

      expect(permissions).toEqual([create, login]);
    });

    test('should return empty array for non-existing IDs', async () => {
      const permissions = await repository.byIds([999, 1000]);

      expect(permissions).toEqual([]);
    });
  });

  describe('assignRole', () => {
    let userId: number;

    beforeEach(async () => {
      userId = await db
        .insertInto('user')
        .values({ username: 'testuser' })
        .returning('id')
        .executeTakeFirstOrThrow()
        .then((row) => row.id);
    });

    test('should assign role to user', async () => {
      const newRole = 'admin';
      const newRoleId = await db
        .insertInto('role')
        .values({ name: newRole })
        .returning('id')
        .executeTakeFirstOrThrow()
        .then((row) => row.id);

      const assignedRoleId = await repository.assignRole(userId, newRole);

      expect(assignedRoleId).toBe(newRoleId);

      const userRole = await db
        .selectFrom('user_role')
        .where('user_id', '=', userId)
        .selectAll()
        .executeTakeFirstOrThrow();

      expect(userRole.role_id).toBe(newRoleId);
    });

    test('should assign role to user without role', async () => {
      const newRole = 'guest';
      const newRoleId = await db
        .insertInto('role')
        .values({ name: newRole })
        .returning('id')
        .executeTakeFirstOrThrow()
        .then((row) => row.id);

      const assignedRoleId = await repository.assignRole(userId, newRole);

      expect(assignedRoleId).toBe(newRoleId);

      const userRole = await db
        .selectFrom('user_role')
        .where('user_id', '=', userId)
        .selectAll()
        .executeTakeFirstOrThrow();

      expect(userRole.role_id).toBe(newRoleId);
    });
  });

  describe('rolePermissions', () => {
    test('should return permissions for a role', async () => {
      const [create, login] = mockPermissions;
      if (!create || !login) {
        throw new Error('Mock permissions are not set up correctly');
      }

      const permissions = await repository.rolePermissions(userRoleId);

      expect(permissions).toEqual([create, login]);
    });
  });
});
