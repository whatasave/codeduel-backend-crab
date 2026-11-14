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
        await tx.insertInto('user_role').values({ role_id: userRoleId, user_id: userId }).execute();

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

  describe('roles', () => {
    let userId: number;
    let adminRoleId: number;

    beforeEach(async () => {
      userId = await db
        .insertInto('user')
        .values({ username: 'testuser' })
        .returning('id')
        .executeTakeFirstOrThrow()
        .then((row) => row.id);

      adminRoleId = await db
        .insertInto('role')
        .values({ name: 'admin' })
        .returning('id')
        .executeTakeFirstOrThrow()
        .then((row) => row.id);
    });

    const userRoleIds = (): Promise<number[]> =>
      db
        .selectFrom('user_role')
        .where('user_id', '=', userId)
        .select('role_id')
        .orderBy('role_id')
        .execute()
        .then((rows) => rows.map((row) => row.role_id));

    test('should assign role to user', async () => {
      const assigned = await repository.assignRole(userId, adminRoleId);

      expect(assigned).toBe(true);
      expect(await userRoleIds()).toEqual([adminRoleId]);
    });

    test('should keep existing roles when assigning a new one', async () => {
      await repository.assignRole(userId, userRoleId);
      await repository.assignRole(userId, adminRoleId);

      expect(await userRoleIds()).toEqual([userRoleId, adminRoleId].sort((a, b) => a - b));
      expect(await repository.getUserRoles(userId)).toEqual([
        {
          id: userRoleId,
          name: 'user',
          createdAt: expect.any(String) as string,
          updatedAt: expect.any(String) as string,
        },
        {
          id: adminRoleId,
          name: 'admin',
          createdAt: expect.any(String) as string,
          updatedAt: expect.any(String) as string,
        },
      ]);
    });

    test('should be idempotent when assigning the same role twice', async () => {
      expect(await repository.assignRole(userId, adminRoleId)).toBe(true);
      expect(await repository.assignRole(userId, adminRoleId)).toBe(false);

      expect(await userRoleIds()).toEqual([adminRoleId]);
    });

    test('should throw for unknown role', async () => {
      const result = await repository.assignRole(userId, 9999).catch((error: unknown) => error);

      expect(result).toBeInstanceOf(Error);
    });

    test('should revoke only the given role', async () => {
      await repository.assignRole(userId, userRoleId);
      await repository.assignRole(userId, adminRoleId);

      expect(await repository.revokeRole(userId, adminRoleId)).toBe(true);
      expect(await userRoleIds()).toEqual([userRoleId]);
      expect(await repository.revokeRole(userId, adminRoleId)).toBe(false);
    });

    test('should merge permissions of all roles without duplicates', async () => {
      const [create, login, view] = mockPermissions;
      if (!create || !login || !view) {
        throw new Error('Mock permissions are not set up correctly');
      }

      await db
        .insertInto('role_permission')
        .values([
          { role_id: adminRoleId, permission_id: create.id },
          { role_id: adminRoleId, permission_id: view.id },
        ])
        .execute();

      await repository.assignRole(userId, userRoleId);
      await repository.assignRole(userId, adminRoleId);

      const permissions = await repository.byUserId(userId);

      expect(permissions.toSorted((a, b) => a.id - b.id)).toEqual([create, login, view]);
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
