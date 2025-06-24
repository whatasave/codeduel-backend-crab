import { afterEach, beforeAll, describe, expect, jest, spyOn, test } from 'bun:test';
import { PermissionService } from './service';
import { PermissionRepository } from './repository';
import type { Permission } from './data';
import type { Database } from '@codeduel-backend-crab/database';

describe('Route.Permission.Service', () => {
  let repository: PermissionRepository;
  let service: PermissionService;

  const mockPermissions: Permission[] = [
    {
      id: 1,
      name: 'read',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 2,
      name: 'write',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 3,
      name: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeAll(async () => {
    repository = new PermissionRepository({} as Database);
    service = new PermissionService(repository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('byUserId', () => {
    test('should return permissions for user when found', async () => {
      const spyByUserId = spyOn(repository, 'byUserId').mockResolvedValue(mockPermissions);

      const result = await service.byUserId(1);

      expect(result).toEqual(mockPermissions);
      expect(spyByUserId).toHaveBeenCalledWith(1);
    });

    test('should return empty array when user has no permissions', async () => {
      const spyByUserId = spyOn(repository, 'byUserId').mockResolvedValue([]);

      const result = await service.byUserId(1);

      expect(result).toEqual([]);
      expect(spyByUserId).toHaveBeenCalledWith(1);
    });
  });

  describe('byIds', () => {
    test('should return permissions', async () => {
      const permissionIds = [1, 2];
      const expectedPermissions = mockPermissions.slice(0, 2);
      const spyByIds = spyOn(repository, 'byIds').mockResolvedValue(expectedPermissions);

      const result = await service.byIds(permissionIds);

      expect(result).toEqual(expectedPermissions);
      expect(spyByIds).toHaveBeenCalledWith(permissionIds);
    });

    test('should return empty array when empty array provided', async () => {
      const spyByIds = spyOn(repository, 'byIds').mockResolvedValue([]);

      const result = await service.byIds([]);

      expect(result).toEqual([]);
      expect(spyByIds).toHaveBeenCalledWith([]);
    });

    // Useful when access tokens have deleted permissions
    test('should return partial results when some id not found', async () => {
      const permissionIds = [1, 999];
      const partialPermissions = mockPermissions.slice(0, 1);
      const spyByIds = spyOn(repository, 'byIds').mockResolvedValue(partialPermissions);

      const result = await service.byIds(permissionIds);

      expect(result).toHaveLength(1);
      expect(result).toEqual(partialPermissions);
      expect(spyByIds).toHaveBeenCalledWith(permissionIds);
    });
  });
});
