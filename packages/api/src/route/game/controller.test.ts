import { describe, test, jest, expect, afterEach, spyOn, beforeAll } from 'bun:test';
import { GameController } from './controller';
import { Logger } from '@codeduel-backend-crab/logger';
import { GameService } from './service';
import { DEFAULT_MODE, type GameWithUserData, type GameWithUsersData } from './data';
import type { GameRepository } from './repository';
import { Router } from '@glass-cannon/router';
import { AuthMiddleware } from '../auth/middleware';
import { AuthService } from '../auth/service';
import type { AuthRepository } from '../auth/repository';
import { PermissionService } from '../permission/service';
import type { PermissionRepository } from '../permission/repository';
import type { Config as AuthConfig } from '../auth/config';

describe('Route.Game.Controller', () => {
  let service: GameService;
  let authService: AuthService;
  let router: Router;

  const mockUser = { id: 1, username: 'testuser', createdAt: new Date().toISOString() };
  const uniqueId = '6a1f7f8e-2c4b-4d39-9a43-5f0f7d3c1b11';

  const mockGame: GameWithUsersData = {
    game: {
      id: 1,
      uniqueId,
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
    userData: [{ user: mockUser, code: 'print(1)', testsPassed: 1, showCode: false }],
  };

  const mockGameOfUser: GameWithUserData = {
    game: mockGame.game,
    userData: { user: mockUser, testsPassed: 1, showCode: false },
  };

  const json = (
    method: string,
    body: unknown,
    headers: Record<string, string> = {}
  ): RequestInit => ({
    method,
    headers: new Headers({ 'Content-Type': 'application/json', ...headers }),
    body: JSON.stringify(body),
  });

  beforeAll(async () => {
    authService = new AuthService(
      {} as AuthRepository,
      new PermissionService({} as PermissionRepository),
      {} as AuthConfig
    );
    service = new GameService({} as GameRepository);
    const controller = new GameController(
      service,
      new AuthMiddleware(authService),
      Logger.create({ level: 'silent', serviceName: 'test' })
    );
    router = Router.from(controller.setup());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('all', () => {
    test('should return all the games', async () => {
      spyOn(service, 'all').mockResolvedValue([mockGame]);

      const response = await router.handle(new Request('http://localhost/'));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([mockGame]);
    });
  });

  describe('byUniqueId', () => {
    test.each(['', '/results'])('GET /:uniqueId%s should return the game', async (suffix) => {
      const spy = spyOn(service, 'byUniqueId').mockResolvedValue(mockGame);

      const response = await router.handle(new Request(`http://localhost/${uniqueId}${suffix}`));

      expect(spy).toHaveBeenCalledWith(uniqueId, expect.any(Object));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(mockGame);
    });

    test.each(['', '/results'])('GET /:uniqueId%s should return 404', async (suffix) => {
      spyOn(service, 'byUniqueId').mockResolvedValue(undefined);

      const response = await router.handle(new Request(`http://localhost/${uniqueId}${suffix}`));

      expect(response.status).toBe(404);
    });
  });

  describe('create', () => {
    // Body sent by the lobby when a game starts.
    const lobbyBody = {
      uniqueId,
      ownerId: 1,
      users: [1, 2],
      challengeId: 1,
      modeId: 1,
      ended: false,
      maxPlayers: 8,
      allowedLanguages: 'python,javascript',
      gameDuration: 900,
    };

    test('should create the game sent by the lobby', async () => {
      const spy = spyOn(service, 'create').mockResolvedValue(mockGame);

      const response = await router.handle(
        new Request('http://localhost/', json('POST', lobbyBody))
      );

      expect(spy).toHaveBeenCalledWith(lobbyBody, expect.any(Object));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(mockGame);
    });

    test('should accept the allowed languages as a list', async () => {
      const body = { ...lobbyBody, allowedLanguages: ['python'] };
      const spy = spyOn(service, 'create').mockResolvedValue(mockGame);

      const response = await router.handle(new Request('http://localhost/', json('POST', body)));

      expect(spy).toHaveBeenCalledWith(body, expect.any(Object));
      expect(response.status).toBe(200);
    });

    test('should return 409 if the game already exists', async () => {
      spyOn(service, 'create').mockResolvedValue(undefined);

      const response = await router.handle(
        new Request('http://localhost/', json('POST', lobbyBody))
      );

      expect(response.status).toBe(409);
    });
  });

  describe('submit', () => {
    // Body sent by the lobby on submission.
    const lobbyBody = {
      userId: 1,
      gameId: uniqueId,
      code: 'print(1)',
      language: 'python',
      testsPassed: 2,
      submittedAt: '2025-11-19 10:00:00.123 +0000 UTC',
    };

    test('should save the submission', async () => {
      const spy = spyOn(service, 'updateSubmission').mockResolvedValue(true);

      const response = await router.handle(
        new Request(`http://localhost/${uniqueId}/submit`, json('PATCH', lobbyBody))
      );

      expect(spy).toHaveBeenCalledWith(uniqueId, lobbyBody, expect.any(Object));
      expect(response.status).toBe(204);
    });

    test('should return 404 if game or player not found', async () => {
      spyOn(service, 'updateSubmission').mockResolvedValue(false);

      const response = await router.handle(
        new Request(`http://localhost/${uniqueId}/submit`, json('PATCH', lobbyBody))
      );

      expect(response.status).toBe(404);
    });
  });

  describe('endGame', () => {
    test('should end the game', async () => {
      const spy = spyOn(service, 'endGame').mockResolvedValue(true);

      const response = await router.handle(
        new Request(`http://localhost/${uniqueId}/endgame`, json('PATCH', {}))
      );

      expect(spy).toHaveBeenCalledWith(uniqueId, expect.any(Object));
      expect(response.status).toBe(204);
    });

    test('should return 404 if game not found', async () => {
      spyOn(service, 'endGame').mockResolvedValue(false);

      const response = await router.handle(
        new Request(`http://localhost/${uniqueId}/endgame`, json('PATCH', {}))
      );

      expect(response.status).toBe(404);
    });
  });

  describe('shareCode', () => {
    test('should share the code of the logged user', async () => {
      spyOn(authService, 'verifySession').mockResolvedValue({
        id: 1,
        username: 'testuser',
        permissions: [],
      });
      const spy = spyOn(service, 'shareCode').mockResolvedValue(true);

      const response = await router.handle(
        new Request(
          'http://localhost/sharecode',
          json('PATCH', { lobbyId: 1, showCode: true }, { authorization: 'Bearer token' })
        )
      );

      expect(spy).toHaveBeenCalledWith(1, 1, true, expect.any(Object));
      expect(response.status).toBe(204);
    });

    test('should accept the unique id of the game', async () => {
      spyOn(authService, 'verifySession').mockResolvedValue({
        id: 1,
        username: 'testuser',
        permissions: [],
      });
      const spy = spyOn(service, 'shareCode').mockResolvedValue(true);

      const response = await router.handle(
        new Request(
          'http://localhost/sharecode',
          json('PATCH', { lobbyId: uniqueId, showCode: true }, { authorization: 'Bearer token' })
        )
      );

      expect(spy).toHaveBeenCalledWith(uniqueId, 1, true, expect.any(Object));
      expect(response.status).toBe(204);
    });

    test('should return 401 without a session', async () => {
      const spy = spyOn(service, 'shareCode');

      const response = await router.handle(
        new Request('http://localhost/sharecode', json('PATCH', { lobbyId: 1, showCode: true }))
      );

      expect(spy).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });
  });

  describe('byUserId', () => {
    test('should return the games of the user', async () => {
      const spy = spyOn(service, 'byUserId').mockResolvedValue([mockGameOfUser]);

      const response = await router.handle(new Request('http://localhost/user/1'));

      expect(spy).toHaveBeenCalledWith(1, expect.any(Object));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([mockGameOfUser]);
    });
  });
});
