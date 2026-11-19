import { afterEach, beforeAll, describe, expect, jest, spyOn, test } from 'bun:test';
import { GameService } from './service';
import { GameRepository } from './repository';
import type { Database } from '@codeduel-backend-crab/database';
import {
  DEFAULT_MODE,
  type CreateGame,
  type GameWithUsersData,
  type UpdateSubmission,
} from './data';

describe('Route.Game.Service', () => {
  let repository: GameRepository;
  let service: GameService;

  const mockUser = { id: 1, username: 'testuser', createdAt: new Date().toISOString() };

  const mockGame: GameWithUsersData = {
    game: {
      id: 1,
      uniqueId: 'lobby-id',
      challenge: {
        id: 1,
        owner: mockUser,
        title: 'Test Challenge',
        description: 'This is a test challenge',
        content: 'print("Hello, World!")',
        testCases: 2,
        createdAt: new Date().toISOString(),
      },
      ownerId: 1,
      ended: false,
      mode: DEFAULT_MODE,
      maxPlayers: 8,
      duration: 900,
      allowedLanguages: ['python', 'javascript'],
      createdAt: new Date().toISOString(),
    },
    userData: [{ user: mockUser, testsPassed: 0, showCode: false }],
  };

  const createGame: CreateGame = {
    uniqueId: 'lobby-id',
    challengeId: 1,
    ownerId: 1,
    ended: false,
    modeId: 1,
    maxPlayers: 8,
    gameDuration: 900,
    allowedLanguages: 'python,javascript',
    users: [1],
  };

  const submission: UpdateSubmission = {
    userId: 1,
    gameId: 'lobby-id',
    code: 'print(1)',
    language: 'python',
    testsPassed: 2,
    submittedAt: '2025-11-19 10:00:00 +0000 UTC',
  };

  beforeAll(() => {
    repository = new GameRepository({} as Database);
    service = new GameService(repository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    test('should create a game splitting the allowed languages', async () => {
      spyOn(repository, 'byUniqueId').mockResolvedValue(undefined);
      const spyCreate = spyOn(repository, 'create').mockResolvedValue(mockGame);

      const game = await service.create(createGame);

      expect(spyCreate).toHaveBeenCalledWith({
        ...createGame,
        allowedLanguages: ['python', 'javascript'],
      });
      expect(game).toEqual(mockGame);
    });

    test('should return undefined if the game already exists', async () => {
      spyOn(repository, 'byUniqueId').mockResolvedValue(mockGame);
      const spyCreate = spyOn(repository, 'create');

      expect(await service.create(createGame)).toBeUndefined();
      expect(spyCreate).not.toHaveBeenCalled();
    });
  });

  describe('parseAllowedLanguages', () => {
    test('should accept comma separated languages', () => {
      expect(GameService.parseAllowedLanguages('python, javascript,,c')).toEqual([
        'python',
        'javascript',
        'c',
      ]);
    });

    test('should accept a list of languages', () => {
      expect(GameService.parseAllowedLanguages(['python', ' c '])).toEqual(['python', 'c']);
    });
  });

  describe('byUniqueId', () => {
    test('should get a game by unique id', async () => {
      const spy = spyOn(repository, 'byUniqueId').mockResolvedValue(mockGame);

      expect(await service.byUniqueId('lobby-id')).toEqual(mockGame);
      expect(spy).toHaveBeenCalledWith('lobby-id');
    });

    test('should return undefined if game not found', async () => {
      spyOn(repository, 'byUniqueId').mockResolvedValue(undefined);

      expect(await service.byUniqueId('lobby-id')).toBeUndefined();
    });
  });

  describe('all', () => {
    test('should get all the games', async () => {
      spyOn(repository, 'all').mockResolvedValue([mockGame]);

      expect(await service.all()).toEqual([mockGame]);
    });
  });

  describe('updateSubmission', () => {
    test('should update the submission with the server time', async () => {
      const spy = spyOn(repository, 'updateSubmission').mockResolvedValue(true);

      expect(await service.updateSubmission('lobby-id', submission)).toBe(true);
      expect(spy).toHaveBeenCalledWith('lobby-id', submission, expect.any(String));
      expect(spy.mock.calls[0]?.[2]).not.toBe(submission.submittedAt);
    });

    test('should return false if game or player not found', async () => {
      spyOn(repository, 'updateSubmission').mockResolvedValue(false);

      expect(await service.updateSubmission('lobby-id', submission)).toBe(false);
    });
  });

  describe('shareCode', () => {
    test('should share code', async () => {
      const spy = spyOn(repository, 'shareCode').mockResolvedValue(true);

      expect(await service.shareCode('lobby-id', 1, true)).toBe(true);
      expect(spy).toHaveBeenCalledWith('lobby-id', 1, true);
    });

    test('should return false if game or player not found', async () => {
      spyOn(repository, 'shareCode').mockResolvedValue(false);

      expect(await service.shareCode(1, 1, true)).toBe(false);
    });
  });

  describe('endGame', () => {
    test('should end a game', async () => {
      const spy = spyOn(repository, 'endGame').mockResolvedValue(true);

      expect(await service.endGame('lobby-id')).toBe(true);
      expect(spy).toHaveBeenCalledWith('lobby-id');
    });

    test('should return false if game not found', async () => {
      spyOn(repository, 'endGame').mockResolvedValue(false);

      expect(await service.endGame('lobby-id')).toBe(false);
    });
  });

  describe('byUserId', () => {
    test('should get games by user id', async () => {
      const [userData] = mockGame.userData;
      if (!userData) throw new Error('Should never happen');
      const games = [{ game: mockGame.game, userData }];
      const spy = spyOn(repository, 'byUserId').mockResolvedValue(games);

      expect(await service.byUserId(1)).toEqual(games);
      expect(spy).toHaveBeenCalledWith(1);
    });
  });
});
