import { describe, test, jest, expect, afterEach, spyOn, beforeAll } from 'bun:test';
import { ChallengeService } from './service';
import type { ChallengeDetailed, ChallengeSummary, Challenge } from './data';
import { ChallengeController } from './controller';
import { Logger } from '@codeduel-backend-crab/logger';
import type { ChallengeRepository } from './repository';
import { Router } from '@glass-cannon/router';
import { AuthMiddleware } from '../auth/middleware';
import { AuthService } from '../auth/service';
import type { AuthRepository } from '../auth/repository';
import { PermissionService } from '../permission/service';
import type { PermissionRepository } from '../permission/repository';
import type { Config as AuthConfig } from '../auth/config';
import type { Permission } from '../permission/data';

describe('Route.Challenge.Controller', () => {
  let service: ChallengeService;
  let authService: AuthService;
  let controller: ChallengeController;
  let router: Router;

  const mockChallenge: Challenge = {
    id: 1,
    ownerId: 1,
    title: 'Test Challenge',
    description: 'This is a test challenge',
    content: 'print("Hello, World!")',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockChallengeSummary: ChallengeSummary = {
    id: 1,
    owner: {
      id: 1,
      username: 'testuser',
      name: 'Test User',
      avatar: 'avatar.png',
      createdAt: new Date().toISOString(),
    },
    title: 'Test Challenge',
    description: 'This is a test challenge',
    content: 'print("Hello, World!")',
    testCases: 2,
    createdAt: new Date().toISOString(),
  };

  const mockChallengeDetailed: ChallengeDetailed = {
    ...mockChallengeSummary,
    testCases: [{ input: 'input', output: 'output' }],
    hiddenTestCases: [{ input: 'hidden', output: 'hidden' }],
  };

  const challengeBody = {
    title: 'Updated Title',
    description: 'This is an updated test challenge',
    content: 'print("Hello, Updated World!")',
  };

  const permission = (name: string): Permission => ({
    id: 1,
    resource: 'challenge',
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const authenticate = (userId: number, permissions: string[]): ReturnType<typeof spyOn> =>
    spyOn(authService, 'verifySession').mockResolvedValue({
      id: userId,
      username: 'testuser',
      permissions: permissions.map(permission),
    });

  const authHeaders = { 'Content-Type': 'application/json', authorization: 'Bearer token' };

  beforeAll(async () => {
    authService = new AuthService(
      {} as AuthRepository,
      new PermissionService({} as PermissionRepository),
      {} as AuthConfig
    );
    service = new ChallengeService({} as ChallengeRepository);
    controller = new ChallengeController(
      service,
      new AuthMiddleware(authService),
      Logger.create({ level: 'silent', serviceName: 'test' })
    );
    router = Router.from(controller.setup());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    const body = {
      title: 'Test Challenge',
      description: 'This is a test challenge',
      content: 'print("Hello, World!")',
    };

    test('should create a challenge owned by the logged user', async () => {
      authenticate(1, ['create']);
      const spyCreate = spyOn(service, 'create').mockResolvedValue(mockChallenge);
      spyOn(service, 'byId').mockResolvedValue(mockChallengeSummary);

      const response = await router.handle(
        new Request('http://localhost/', {
          method: 'POST',
          headers: new Headers(authHeaders),
          body: JSON.stringify(body),
        })
      );

      expect(spyCreate).toHaveBeenCalledTimes(1);
      expect(spyCreate).toHaveBeenCalledWith({ ...body, ownerId: 1 }, expect.any(Object));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(mockChallengeSummary);
    });

    test('should return 401 without a session', async () => {
      const spyCreate = spyOn(service, 'create');

      const response = await router.handle(
        new Request('http://localhost/', {
          method: 'POST',
          headers: new Headers({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(body),
        })
      );

      expect(spyCreate).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });

    test('should return 403 without the create permission', async () => {
      authenticate(1, []);
      const spyCreate = spyOn(service, 'create');

      const response = await router.handle(
        new Request('http://localhost/', {
          method: 'POST',
          headers: new Headers(authHeaders),
          body: JSON.stringify(body),
        })
      );

      expect(spyCreate).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });
  });

  describe('byId', () => {
    test('should get a challenge by id', async () => {
      const spyById = spyOn(service, 'byId').mockResolvedValue(mockChallengeSummary);

      const response = await router.handle(new Request('http://localhost/1', { method: 'GET' }));

      expect(spyById).toHaveBeenCalledTimes(1);
      expect(spyById).toHaveBeenCalledWith(1, expect.any(Object));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(mockChallengeSummary);
    });

    test('should return 404 if challenge not found', async () => {
      const spyById = spyOn(service, 'byId').mockResolvedValue(undefined);

      const response = await router.handle(new Request('http://localhost/1', { method: 'GET' }));

      expect(spyById).toHaveBeenCalledTimes(1);
      expect(spyById).toHaveBeenCalledWith(1, expect.any(Object));
      expect(response.status).toBe(404);
    });
  });

  describe('all', () => {
    test('should get all challenges', async () => {
      const spyAll = spyOn(service, 'all').mockResolvedValue([mockChallengeSummary]);

      const response = await router.handle(new Request('http://localhost/', { method: 'GET' }));

      expect(spyAll).toHaveBeenCalledTimes(1);
      expect(spyAll).toHaveBeenCalledWith(expect.any(Object));
      expect(response.status).toEqual(200);
      expect(await response.json()).toEqual([mockChallengeSummary]);
    });
  });

  describe('update', () => {
    const update = (): Response | Promise<Response> =>
      router.handle(
        new Request('http://localhost/1', {
          method: 'PUT',
          headers: new Headers(authHeaders),
          body: JSON.stringify(challengeBody),
        })
      );

    test('should update an own challenge', async () => {
      authenticate(1, ['update:own']);
      spyOn(service, 'byId').mockResolvedValue(mockChallengeSummary);
      const spyUpdate = spyOn(service, 'update').mockResolvedValue(mockChallenge);

      const response = await update();

      expect(spyUpdate).toHaveBeenCalledTimes(1);
      expect(spyUpdate).toHaveBeenCalledWith({ ...challengeBody, id: 1 }, expect.any(Object));
      expect(response.status).toEqual(204);
    });

    test('should update any challenge with update:any', async () => {
      authenticate(2, ['update:any']);
      spyOn(service, 'byId').mockResolvedValue(mockChallengeSummary);
      const spyUpdate = spyOn(service, 'update').mockResolvedValue(mockChallenge);

      const response = await update();

      expect(spyUpdate).toHaveBeenCalledTimes(1);
      expect(response.status).toEqual(204);
    });

    test('should return 403 on a challenge of another user', async () => {
      authenticate(2, ['update:own']);
      spyOn(service, 'byId').mockResolvedValue(mockChallengeSummary);
      const spyUpdate = spyOn(service, 'update');

      const response = await update();

      expect(spyUpdate).not.toHaveBeenCalled();
      expect(response.status).toEqual(403);
    });

    test('should return 404 on update not found', async () => {
      authenticate(1, ['update:own']);
      spyOn(service, 'byId').mockResolvedValue(undefined);
      const spyUpdate = spyOn(service, 'update');

      const response = await update();

      expect(spyUpdate).not.toHaveBeenCalled();
      expect(response.status).toBe(404);
    });
  });

  describe('delete', () => {
    const remove = (): Response | Promise<Response> =>
      router.handle(
        new Request('http://localhost/1', { method: 'DELETE', headers: new Headers(authHeaders) })
      );

    test('should delete an own challenge', async () => {
      authenticate(1, ['delete:own']);
      spyOn(service, 'byId').mockResolvedValue(mockChallengeSummary);
      const spyDelete = spyOn(service, 'delete').mockResolvedValue(true);

      const response = await remove();

      expect(spyDelete).toHaveBeenCalledTimes(1);
      expect(spyDelete).toHaveBeenCalledWith(1, expect.any(Object));
      expect(response.status).toBe(204);
    });

    test('should return 403 on a challenge of another user', async () => {
      authenticate(2, ['delete:own']);
      spyOn(service, 'byId').mockResolvedValue(mockChallengeSummary);
      const spyDelete = spyOn(service, 'delete');

      const response = await remove();

      expect(spyDelete).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });
  });

  describe('random', () => {
    test('should get a random challenge', async () => {
      const spyRandom = spyOn(service, 'random').mockResolvedValue(mockChallengeDetailed);

      const response = await router.handle(
        new Request('http://localhost/random', { method: 'GET' })
      );

      expect(spyRandom).toHaveBeenCalledTimes(1);
      expect(spyRandom).toHaveBeenCalledWith(expect.any(Object));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(mockChallengeDetailed);
    });

    test('should return 404 if no challenges exist', async () => {
      const spyRandom = spyOn(service, 'random').mockResolvedValue(undefined);

      const response = await router.handle(
        new Request('http://localhost/random', { method: 'GET' })
      );

      expect(spyRandom).toHaveBeenCalledTimes(1);
      expect(spyRandom).toHaveBeenCalledWith(expect.any(Object));
      expect(response.status).toBe(404);
    });
  });
});
