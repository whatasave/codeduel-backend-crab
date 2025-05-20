import { afterEach, beforeAll, describe, expect, jest, spyOn, test } from 'bun:test';
import { GameService } from './service';
import { GameRepository } from './repository';
import type { Game, GameOfUser, GameWithUserData, UpdateGameUser } from './data';
import type { Database } from '@codeduel-backend-crab/database';

describe('Route.Game.Service', () => {
  let repository: GameRepository;
  let service: GameService;

  const mockGame: Game = {
    id: 1,
    host: {
      id: 1,
      username: 'testuser',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    challenge: {
      id: 1,
      title: 'Test Challenge',
      description: 'This is a test challenge',
      content: 'print("Hello, World!")',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      owner: {
        id: 1,
        username: 'testuser',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      testCases: [
        {
          input: 'input',
          output: 'output',
        },
      ],
    },
    duration: 60,
    allowedLanguages: ['python', 'javascript'],
    maxPlayers: 2,
  };

  const mockGameWithUsers: GameWithUserData = {
    game: mockGame,
    users: [
      {
        userId: 1,
        showCode: false,
        testsPassed: 0,
        code: 'print("Hello, World!")',
      },
    ],
  };

  const mockGamesOfUser: GameOfUser = {
    game: mockGame,
    user: {
      userId: 1,
      showCode: false,
      testsPassed: 0,
      code: 'print("Hello, World!")',
    },
  };

  beforeAll(async () => {
    repository = new GameRepository({} as Database);
    service = new GameService(repository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    const createGame = {
      challengeId: 1,
      hostId: 1,
      duration: 60,
      maxPlayers: 2,
      allowedLanguages: ['python', 'javascript'],
      userIds: [1],
    };

    test('should create a game', async () => {
      const spyCreate = spyOn(repository, 'create').mockResolvedValue(mockGameWithUsers);

      const game = await service.create(createGame);

      expect(game).toEqual(mockGameWithUsers);
      expect(spyCreate).toHaveBeenCalledWith(createGame);
    });

    test('should create a game with random challenge', async () => {
      const spyCreate = spyOn(repository, 'create').mockResolvedValue(mockGameWithUsers);

      const game = await service.create({ ...createGame, challengeId: undefined });

      expect(game).toEqual(mockGameWithUsers);
      expect(spyCreate).toHaveBeenCalledWith({ ...createGame, challengeId: undefined });
    });
  });

  describe('byId', () => {
    test('should get a game by id', async () => {
      const spyById = spyOn(repository, 'byId').mockResolvedValue(mockGameWithUsers);

      const game = await service.byId(1);

      expect(spyById).toHaveBeenCalledWith(1);
      expect(game).toEqual(mockGameWithUsers);
    });

    test('should return undefined if game not found', async () => {
      const spyById = spyOn(repository, 'byId').mockResolvedValue(undefined);

      const game = await service.byId(999);

      expect(spyById).toHaveBeenCalledWith(999);
      expect(game).toBeUndefined();
    });
  });

  describe('updateSubmission', () => {
    const updateGameUser: UpdateGameUser = {
      gameId: 1,
      userId: 1,
      testsPassed: 1,
      code: 'print("Hello, World!")',
      language: 'python',
    };

    test('should update game user submission', async () => {
      const spyUpdate = spyOn(repository, 'updateUser').mockResolvedValue();

      await service.updateSubmission(updateGameUser);

      expect(spyUpdate).toHaveBeenCalledWith(updateGameUser, expect.any(String));
    });

    test('should throw error if game user not found', async () => {
      const spyUpdate = spyOn(repository, 'updateUser').mockRejectedValue(
        new Error('Game user not found')
      );

      expect(service.updateSubmission(updateGameUser)).rejects.toThrow('Game user not found');

      expect(spyUpdate).toHaveBeenCalledWith(updateGameUser, expect.any(String));
    });
  });

  describe('shareCode', () => {
    const shareCode = {
      gameId: 1,
      userId: 1,
      showCode: true,
    };

    test('should share code', async () => {
      const spyShareCode = spyOn(repository, 'shareCode').mockResolvedValue();

      await service.shareCode(shareCode);

      expect(spyShareCode).toHaveBeenCalledWith(shareCode);
    });

    test('should throw error if game user not found', async () => {
      const spyShareCode = spyOn(repository, 'shareCode').mockRejectedValue(
        new Error('Game user not found')
      );

      expect(service.shareCode(shareCode)).rejects.toThrow('Game user not found');

      expect(spyShareCode).toHaveBeenCalledWith(shareCode);
    });
  });

  describe('endGame', () => {
    test('should end a game', async () => {
      const spyEndGame = spyOn(repository, 'endGame').mockResolvedValue();

      await service.endGame(1);

      expect(spyEndGame).toHaveBeenCalledWith(1);
    });

    test('should throw error if game not found', async () => {
      const spyEndGame = spyOn(repository, 'endGame').mockRejectedValue(
        new Error('Game not found')
      );

      expect(service.endGame(999)).rejects.toThrow('Game not found');

      expect(spyEndGame).toHaveBeenCalledWith(999);
    });
  });

  describe('byUserId', () => {
    test('should get games by user id', async () => {
      const spyByUserId = spyOn(repository, 'byUserId').mockResolvedValue([mockGamesOfUser]);

      const games = await service.byUserId(1);

      expect(spyByUserId).toHaveBeenCalledWith(1);
      expect(games).toEqual([mockGamesOfUser]);
    });

    test('should return empty array if no games found', async () => {
      const spyByUserId = spyOn(repository, 'byUserId').mockResolvedValue([]);

      const games = await service.byUserId(999);

      expect(spyByUserId).toHaveBeenCalledWith(999);
      expect(games).toEqual([]);
    });
  });
});
