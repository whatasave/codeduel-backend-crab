import { describe, test, jest, expect, afterEach, spyOn, beforeAll } from 'bun:test';
import { ChallengeService } from './service';
import type {
  ChallengeWithUser,
  ChallengeWithUserAndTestCases,
  CreateChallenge,
  Challenge,
} from './data';
import { ChallengeController } from './controller';
import type { ChallengeRepository } from './repository';

describe('Route.Challenge.Controller', () => {
  let service: ChallengeService;
  let controller: ChallengeController;

  const mockChallenge: Challenge = {
    id: 1,
    ownerId: 1,
    title: 'Test Challenge',
    description: 'This is a test challenge',
    content: 'print("Hello, World!")',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockChallengeDetailed: ChallengeWithUser = {
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

  const mockGameChallenge: ChallengeWithUserAndTestCases = {
    ...mockChallengeDetailed,
    testCases: [{ input: 'input', output: 'output' }],
  };

  beforeAll(async () => {
    service = new ChallengeService({} as ChallengeRepository);
    controller = new ChallengeController(service);
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

      const challenge = await controller.create.handler({
        method: 'POST',
        path: '/',
        headers: new Headers(),
        params: {},
        query: {},
        body: mockCreateChallenge,
      });

      expect(spyCreate).toHaveBeenCalledTimes(1);
      expect(spyCreate).toHaveBeenCalledWith(mockCreateChallenge);
      expect(challenge).toEqual({ status: 201, body: mockChallengeDetailed });
    });
  });

  describe('byId', () => {
    test('should get a challenge by id', async () => {
      const spyById = spyOn(service, 'byId').mockResolvedValue(mockGameChallenge);

      const challenge = await controller.byId.handler({
        method: 'GET',
        path: '/1',
        headers: new Headers(),
        params: { id: '1' },
        query: {},
        body: undefined,
      });

      expect(spyById).toHaveBeenCalledTimes(1);
      expect(spyById).toHaveBeenCalledWith(1);
      expect(challenge).toEqual({ status: 200, body: mockGameChallenge });
    });

    test('should return undefined if challenge not found', async () => {
      const spyById = spyOn(service, 'byId').mockResolvedValue(undefined);

      const challenge = await controller.byId.handler({
        method: 'GET',
        path: '/1',
        headers: new Headers(),
        params: { id: '1' },
        query: {},
        body: undefined,
      });

      expect(spyById).toHaveBeenCalledTimes(1);
      expect(spyById).toHaveBeenCalledWith(1);
      expect(challenge).toEqual({ status: 404 });
    });
  });

  describe('all', () => {
    test('should get all challenges', async () => {
      const spyAll = spyOn(service, 'all').mockResolvedValue([mockChallengeDetailed]);

      const challenges = await controller.all.handler({
        method: 'GET',
        path: '/',
        headers: new Headers(),
        params: {},
        query: {},
        body: undefined,
      });

      expect(spyAll).toHaveBeenCalledTimes(1);
      expect(spyAll).toHaveBeenCalledWith();
      expect(challenges).toEqual({ status: 200, body: [mockChallengeDetailed] });
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

      const challenge = await controller.update.handler({
        method: 'PUT',
        path: '/',
        headers: new Headers(),
        params: {},
        query: {},
        body: updatedChallenge,
      });

      expect(spyUpdate).toHaveBeenCalledTimes(1);
      expect(spyUpdate).toHaveBeenCalledWith(updatedChallenge);
      expect(challenge).toEqual({ status: 200, body: mockChallengeDetailed });
    });

    test('should return undefined on update not found', async () => {
      const spyUpdate = spyOn(service, 'update').mockResolvedValue(undefined);

      const updatedChallenge = {
        id: 999,
        title: 'Updated Title',
        description: 'This is an updated test challenge',
        content: 'print("Hello, Updated World!")',
      };

      const challenge = await controller.update.handler({
        method: 'PUT',
        path: '/',
        headers: new Headers(),
        params: {},
        query: {},
        body: updatedChallenge,
      });

      expect(spyUpdate).toHaveBeenCalledTimes(1);
      expect(spyUpdate).toHaveBeenCalledWith(updatedChallenge);
      expect(challenge).toEqual({ status: 404 });
    });
  });

  describe('delete', () => {
    test('should delete a challenge', async () => {
      const spyDelete = spyOn(service, 'delete').mockResolvedValue(true);

      const challenge = await controller.delete.handler({
        method: 'DELETE',
        path: '/1',
        headers: new Headers(),
        params: { id: '1' },
        query: {},
        body: undefined,
      });

      expect(spyDelete).toHaveBeenCalledTimes(1);
      expect(spyDelete).toHaveBeenCalledWith(1);
      expect(challenge).toEqual({ status: 204 });
    });
  });

  describe('random', () => {
    test('should get a random challenge', async () => {
      const spyRandom = spyOn(service, 'random').mockResolvedValue(mockGameChallenge);

      const challenge = await controller.random.handler({
        method: 'GET',
        path: '/random',
        headers: new Headers(),
        params: {},
        query: {},
        body: undefined,
      });

      expect(spyRandom).toHaveBeenCalledTimes(1);
      expect(spyRandom).toHaveBeenCalledWith();
      expect(challenge).toEqual({ status: 200, body: mockGameChallenge });
    });

    test('should return undefined if no challenges exist', async () => {
      const spyRandom = spyOn(service, 'random').mockResolvedValue(undefined);

      const challenge = await controller.random.handler({
        method: 'GET',
        path: '/random',
        headers: new Headers(),
        params: {},
        query: {},
        body: undefined,
      });

      expect(spyRandom).toHaveBeenCalledTimes(1);
      expect(spyRandom).toHaveBeenCalledWith();
      expect(challenge).toEqual({ status: 404 });
    });
  });
});
