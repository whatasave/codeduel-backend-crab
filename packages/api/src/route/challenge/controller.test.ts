import { describe, test, jest, expect, afterEach, spyOn, beforeAll } from 'bun:test';
import { ChallengeService } from './service';
import type {
  ChallengeWithUser,
  ChallengeWithUserAndTestCases,
  CreateChallenge,
  Challenge,
} from './data';
import { ChallengeController } from './controller';
import { Logger } from '@codeduel-backend-crab/logger';
import type { ChallengeRepository } from './repository';
import { Router } from '@glass-cannon/router';

describe('Route.Challenge.Controller', () => {
  let service: ChallengeService;
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

  const mockChallengeWithUser: ChallengeWithUser = {
    id: 1,
    owner: {
      id: 1,
      username: 'testuser',
      name: 'Test User',
      avatar: 'avatar.png',
      backgroundImage: 'background.png',
      biography: 'This is a test user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    title: 'Test Challenge',
    description: 'This is a test challenge',
    content: 'print("Hello, World!")',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockChallengeWithUserAndTestCases: ChallengeWithUserAndTestCases = {
    ...mockChallengeWithUser,
    testCases: [{ input: 'input', output: 'output' }],
  };

  beforeAll(async () => {
    service = new ChallengeService({} as ChallengeRepository);
    controller = new ChallengeController(
      service,
      Logger.create({ level: 'silent', serviceName: 'test' })
    );
    router = Router.from(controller.setup());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    const mockCreateChallenge: CreateChallenge = {
      ownerId: 1,
      title: 'Test Challenge',
      description: 'This is a test challenge',
      content: 'print("Hello, World!")',
    };

    test('should create a challenge', async () => {
      const spyCreate = spyOn(service, 'create').mockResolvedValue(mockChallenge);

      const response = await router.handle(
        new Request('http://localhost/', {
          method: 'POST',
          headers: new Headers({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(mockCreateChallenge),
        })
      );

      expect(spyCreate).toHaveBeenCalledTimes(1);
      expect(spyCreate).toHaveBeenCalledWith(mockCreateChallenge, expect.any(Object));
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual(mockChallenge);
    });
  });

  describe('byId', () => {
    test('should get a challenge by id', async () => {
      const spyById = spyOn(service, 'byId').mockResolvedValue(mockChallengeWithUserAndTestCases);

      const response = await router.handle(new Request('http://localhost/1', { method: 'GET' }));

      expect(spyById).toHaveBeenCalledTimes(1);
      expect(spyById).toHaveBeenCalledWith(1, expect.any(Object));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(mockChallengeWithUserAndTestCases);
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
      const spyAll = spyOn(service, 'all').mockResolvedValue([mockChallengeWithUser]);

      const response = await router.handle(new Request('http://localhost/', { method: 'GET' }));

      expect(spyAll).toHaveBeenCalledTimes(1);
      expect(spyAll).toHaveBeenCalledWith(expect.any(Object));
      expect(response.status).toEqual(200);
      expect(await response.json()).toEqual([mockChallengeWithUser]);
    });
  });

  describe('update', () => {
    test('should update a challenge', async () => {
      const spyUpdate = spyOn(service, 'update').mockResolvedValue(mockChallenge);

      const updatedChallenge = {
        id: 1,
        title: 'Updated Title',
        description: 'This is an updated test challenge',
        content: 'print("Hello, Updated World!")',
      };

      const response = await router.handle(
        new Request('http://localhost/', {
          method: 'PUT',
          headers: new Headers({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(updatedChallenge),
        })
      );

      expect(spyUpdate).toHaveBeenCalledTimes(1);
      expect(spyUpdate).toHaveBeenCalledWith(updatedChallenge, expect.any(Object));
      expect(response.status).toEqual(200);
      expect(await response.json()).toEqual(mockChallenge);
    });

    test('should return 404 on update not found', async () => {
      const spyUpdate = spyOn(service, 'update').mockResolvedValue(undefined);

      const updatedChallenge = {
        id: 999,
        title: 'Updated Title',
        description: 'This is an updated test challenge',
        content: 'print("Hello, Updated World!")',
      };

      const response = await router.handle(
        new Request('http://localhost/', {
          method: 'PUT',
          headers: new Headers({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(updatedChallenge),
        })
      );

      expect(spyUpdate).toHaveBeenCalledTimes(1);
      expect(spyUpdate).toHaveBeenCalledWith(updatedChallenge, expect.any(Object));
      expect(response.status).toBe(404);
    });
  });

  describe('delete', () => {
    test('should delete a challenge', async () => {
      const spyDelete = spyOn(service, 'delete').mockResolvedValue(true);

      const response = await router.handle(new Request('http://localhost/1', { method: 'DELETE' }));

      expect(spyDelete).toHaveBeenCalledTimes(1);
      expect(spyDelete).toHaveBeenCalledWith(1, expect.any(Object));
      expect(response.status).toBe(204);
    });
  });

  describe('random', () => {
    test('should get a random challenge', async () => {
      const spyRandom = spyOn(service, 'random').mockResolvedValue(
        mockChallengeWithUserAndTestCases
      );

      const response = await router.handle(
        new Request('http://localhost/random', { method: 'GET' })
      );

      expect(spyRandom).toHaveBeenCalledTimes(1);
      expect(spyRandom).toHaveBeenCalledWith(expect.any(Object));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(mockChallengeWithUserAndTestCases);
    });

    test('should return undefined if no challenges exist', async () => {
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
