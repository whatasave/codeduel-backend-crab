import { describe, test, jest, expect, afterEach, spyOn, beforeAll } from 'bun:test';

import type { Database } from '@codeduel-backend-crab/database';

import type {
  ChallengeDetailed,
  ChallengeSummary,
  CreateChallenge,
  UpdateChallenge,
  Challenge,
} from './data';
import { ChallengeRepository } from './repository';
import { ChallengeService } from './service';

describe('Route.Challenge.Service', () => {
  let repository: ChallengeRepository;
  let service: ChallengeService;

  const mockChallenge: Challenge = {
    id: 1,
    ownerId: 1,
    title: 'Test Challenge',
    description: 'This is a test challenge',
    content: 'print("Hello, World!")',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockOwner = {
    id: 1,
    username: 'testuser',
    name: 'Test User',
    avatar: 'avatar.png',
    createdAt: new Date().toISOString(),
  };

  const mockChallengeSummary: ChallengeSummary = {
    id: 1,
    owner: mockOwner,
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

  beforeAll(async () => {
    repository = new ChallengeRepository({} as Database);
    service = new ChallengeService(repository);
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
      const spyCreate = spyOn(repository, 'create').mockResolvedValue(mockChallenge);

      const challenge = await service.create(mockCreateChallenge);

      expect(spyCreate).toHaveBeenCalledTimes(1);
      expect(spyCreate).toHaveBeenCalledWith(mockCreateChallenge);
      expect(challenge).toEqual(mockChallenge);
    });
  });

  describe('byId', () => {
    test('should get a challenge by id', async () => {
      const spyById = spyOn(repository, 'byId').mockResolvedValue(mockChallengeSummary);

      const challenge = await service.byId(1);

      expect(spyById).toHaveBeenCalledTimes(1);
      expect(spyById).toHaveBeenCalledWith(1);
      expect(challenge).toEqual(mockChallengeSummary);
    });

    test('should return undefined if challenge not found', async () => {
      const spyById = spyOn(repository, 'byId').mockResolvedValue(undefined);

      const challenge = await service.byId(999);

      expect(spyById).toHaveBeenCalledTimes(1);
      expect(spyById).toHaveBeenCalledWith(999);
      expect(challenge).toBeUndefined();
    });
  });

  describe('all', () => {
    test('should get all challenges', async () => {
      const spyAll = spyOn(repository, 'all').mockResolvedValue([mockChallengeSummary]);

      const allChallenges = await service.all();

      expect(spyAll).toHaveBeenCalledTimes(1);
      expect(allChallenges).toEqual([mockChallengeSummary]);
    });
  });

  describe('update', () => {
    const mockUpdateChallenge: UpdateChallenge = {
      id: 1,
      title: 'Updated Challenge',
      description: 'This is an updated test challenge',
      content: 'print("Hello, Updated World!")',
    };

    test('should update a challenge', async () => {
      const spyUpdate = spyOn(repository, 'update').mockResolvedValue(mockChallenge);

      const updatedChallenge = await service.update(mockUpdateChallenge);

      expect(spyUpdate).toHaveBeenCalledTimes(1);
      expect(spyUpdate).toHaveBeenCalledWith(mockUpdateChallenge);
      expect(updatedChallenge).toEqual(mockChallenge);
    });

    test('should return undefined on update not found', async () => {
      const spyUpdate = spyOn(repository, 'update').mockResolvedValue(undefined);

      const updatedChallenge = await service.update(mockUpdateChallenge);

      expect(spyUpdate).toHaveBeenCalledTimes(1);
      expect(spyUpdate).toHaveBeenCalledWith(mockUpdateChallenge);
      expect(updatedChallenge).toBeUndefined();
    });
  });

  describe('delete', () => {
    test('should delete a challenge', async () => {
      const spyDelete = spyOn(repository, 'delete').mockResolvedValue(true);

      const result = await service.delete(1);

      expect(spyDelete).toHaveBeenCalledTimes(1);
      expect(spyDelete).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });
  });

  describe('random', () => {
    test('should get a random challenge', async () => {
      const spyRandom = spyOn(repository, 'random').mockResolvedValue(mockChallengeDetailed);

      const randomChallenge = await service.random();

      expect(spyRandom).toHaveBeenCalledTimes(1);
      expect(randomChallenge).toEqual(mockChallengeDetailed);
    });

    test('should return undefined if no challenges exist', async () => {
      const spyRandom = spyOn(repository, 'random').mockResolvedValue(undefined);

      const randomChallenge = await service.random();

      expect(spyRandom).toHaveBeenCalledTimes(1);
      expect(randomChallenge).toBeUndefined();
    });
  });
});
