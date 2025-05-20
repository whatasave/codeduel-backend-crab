import { describe, test, jest, expect, afterEach, spyOn, beforeAll } from 'bun:test';
import { GameController } from './controller';
import { GameService } from './service';
import type { CreateGame, Game, GameOfUser, GameWithUserData, UpdateGameUser } from './data';
import type { GameRepository } from './repository';

describe('Route.Game.Controller', () => {
  let service: GameService;
  let controller: GameController;

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
    controller = new GameController(service);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('byId', () => {
    test('should return 200 if game found', async () => {
      const spyById = spyOn(service, 'byId').mockResolvedValue(mockGameWithUsers);

      const result = await controller.byId.handler({
        method: 'GET',
        path: '/game/1',
        headers: new Headers(),
        body: undefined,
        params: { id: '1' },
        query: {},
      });

      expect(spyById).toHaveBeenCalledTimes(1);
      expect(spyById).toHaveBeenCalledWith(1);
      expect(result.status).toBe(200);
      expect(result.body).toEqual(mockGameWithUsers);
    });

    test('should return 404 if game not found', async () => {
      const spyById = spyOn(service, 'byId').mockResolvedValue(undefined);

      const result = await controller.byId.handler({
        method: 'GET',
        path: '/game/999',
        headers: new Headers(),
        body: undefined,
        params: { id: '999' },
        query: {},
      });

      expect(spyById).toHaveBeenCalledTimes(1);
      expect(spyById).toHaveBeenCalledWith(999);
      expect(result.status).toBe(404);
      expect(result.body).toBeUndefined();
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

      const result = await controller.create.handler({
        method: 'POST',
        path: '/',
        headers: new Headers(),
        body: createGame,
        params: {},
        query: {},
      });

      expect(spyCreate).toHaveBeenCalledTimes(1);
      expect(spyCreate).toHaveBeenCalledWith(createGame);
      expect(result.status).toBe(201);
      expect(result.body).toEqual(mockGameWithUsers);
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

      const result = await controller.submit.handler({
        method: 'POST',
        path: '/submit',
        headers: new Headers(),
        body: updateGameUser,
        params: {},
        query: {},
      });

      expect(spyUpdateSubmission).toHaveBeenCalledTimes(1);
      expect(spyUpdateSubmission).toHaveBeenCalledWith(updateGameUser);
      expect(result.status).toBe(204);
      expect(result.body).toBeUndefined();
    });
  });

  describe('endGame', () => {
    test('should return 204 if game ended', async () => {
      const spyEndGame = spyOn(service, 'endGame').mockResolvedValue();

      const result = await controller.endGame.handler({
        method: 'POST',
        path: '/1/end',
        headers: new Headers(),
        body: undefined,
        params: { id: '1' },
        query: {},
      });

      expect(spyEndGame).toHaveBeenCalledTimes(1);
      expect(spyEndGame).toHaveBeenCalledWith(1);
      expect(result.status).toBe(204);
      expect(result.body).toBeUndefined();
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

      const result = await controller.shareCode.handler({
        method: 'POST',
        path: '/sharecode',
        headers: new Headers(),
        body: shareCode,
        params: {},
        query: {},
      });

      expect(spyShareCode).toHaveBeenCalledTimes(1);
      expect(spyShareCode).toHaveBeenCalledWith(shareCode);
      expect(result.status).toBe(204);
      expect(result.body).toBeUndefined();
    });
  });

  describe('byUserId', () => {
    test('should return 200 if games found for user', async () => {
      const spyByUserId = spyOn(service, 'byUserId').mockResolvedValue([mockGamesOfUser]);

      const result = await controller.byUserId.handler({
        method: 'GET',
        path: '/user/1',
        headers: new Headers(),
        body: undefined,
        params: { id: '1' },
        query: {},
      });

      expect(spyByUserId).toHaveBeenCalledTimes(1);
      expect(spyByUserId).toHaveBeenCalledWith(1);
      expect(result.status).toBe(200);
      expect(result.body).toEqual([mockGamesOfUser]);
    });
  });
});
