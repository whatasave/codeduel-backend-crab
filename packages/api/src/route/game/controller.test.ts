import { describe, test, jest, expect, afterEach, spyOn, beforeAll } from 'bun:test';

import { Logger } from '@codeduel-backend-crab/logger';
import { Router } from '@glass-cannon/router';

import { GameController } from './controller';
import type { CreateGame, Game, GameOfUser, GameWithUserData, UpdateGameUser } from './data';
import type { GameRepository } from './repository';
import { GameService } from './service';

describe('Route.Game.Controller', () => {
  let service: GameService;
  let controller: GameController;
  let router: Router;

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
    service = new GameService({} as GameRepository);
    controller = new GameController(
      service,
      Logger.create({ level: 'silent', serviceName: 'test' })
    );
    router = Router.from(controller.setup());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('byId', () => {
    test('should return 200 if game found', async () => {
      const spyById = spyOn(service, 'byId').mockResolvedValue(mockGameWithUsers);

      const result = await router.handle(new Request('http://localhost/1', { method: 'GET' }));

      expect(spyById).toHaveBeenCalledTimes(1);
      expect(spyById).toHaveBeenCalledWith(1, expect.any(Object));
      expect(result.status).toBe(200);
      expect(await result.json()).toEqual(mockGameWithUsers);
    });

    test('should return 404 if game not found', async () => {
      const spyById = spyOn(service, 'byId').mockResolvedValue(undefined);

      const result = await router.handle(new Request('http://localhost/999', { method: 'GET' }));

      expect(spyById).toHaveBeenCalledTimes(1);
      expect(spyById).toHaveBeenCalledWith(999, expect.any(Object));
      expect(result.status).toBe(404);
      expect(result.body).toBeNull();
    });
  });

  describe('create', () => {
    const createGame: CreateGame = {
      challengeId: 1,
      hostId: 1,
      duration: 60,
      maxPlayers: 2,
      allowedLanguages: ['python', 'javascript'],
      userIds: [1],
    };

    test('should return 201 if game created', async () => {
      const spyCreate = spyOn(service, 'create').mockResolvedValue(mockGameWithUsers);

      const result = await router.handle(
        new Request('http://localhost/', {
          method: 'POST',
          headers: new Headers({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(createGame),
        })
      );

      expect(spyCreate).toHaveBeenCalledTimes(1);
      expect(spyCreate).toHaveBeenCalledWith(createGame, expect.any(Object));
      expect(result.status).toBe(201);
      expect(await result.json()).toEqual(mockGameWithUsers);
    });
  });

  describe('submit', () => {
    const updateGameUser: UpdateGameUser = {
      gameId: 1,
      userId: 1,
      code: 'print("Hello, World!")',
      language: 'python',
      testsPassed: 1,
    };

    test('should return 204 if submission updated', async () => {
      const spyUpdateSubmission = spyOn(service, 'updateSubmission').mockResolvedValue();

      const result = await router.handle(
        new Request('http://localhost/submit', {
          method: 'POST',
          headers: new Headers({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(updateGameUser),
        })
      );

      expect(spyUpdateSubmission).toHaveBeenCalledTimes(1);
      expect(spyUpdateSubmission).toHaveBeenCalledWith(updateGameUser, expect.any(Object));
      expect(result.status).toBe(204);
      expect(result.body).toBeNull();
    });
  });

  describe('endGame', () => {
    test('should return 204 if game ended', async () => {
      const spyEndGame = spyOn(service, 'endGame').mockResolvedValue();

      const result = await router.handle(new Request('http://localhost/1/end', { method: 'POST' }));

      expect(spyEndGame).toHaveBeenCalledTimes(1);
      expect(spyEndGame).toHaveBeenCalledWith(1, expect.any(Object));
      expect(result.status).toBe(204);
      expect(result.body).toBeNull();
    });
  });

  describe('shareCode', () => {
    const shareCode = {
      gameId: 1,
      userId: 1,
      showCode: true,
    };

    test('should return 204 if code shared', async () => {
      const spyShareCode = spyOn(service, 'shareCode').mockResolvedValue();

      const result = await router.handle(
        new Request('http://localhost/sharecode', {
          method: 'POST',
          headers: new Headers({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(shareCode),
        })
      );

      expect(spyShareCode).toHaveBeenCalledTimes(1);
      expect(spyShareCode).toHaveBeenCalledWith(shareCode, expect.any(Object));
      expect(result.status).toBe(204);
      expect(result.body).toBeNull();
    });
  });

  describe('byUserId', () => {
    test('should return 200 if games found for user', async () => {
      const spyByUserId = spyOn(service, 'byUserId').mockResolvedValue([mockGamesOfUser]);

      const result = await router.handle(new Request('http://localhost/user/1', { method: 'GET' }));

      expect(spyByUserId).toHaveBeenCalledTimes(1);
      expect(spyByUserId).toHaveBeenCalledWith(1, expect.any(Object));
      expect(result.status).toBe(200);
      expect(await result.json()).toEqual([mockGamesOfUser]);
    });
  });
});
