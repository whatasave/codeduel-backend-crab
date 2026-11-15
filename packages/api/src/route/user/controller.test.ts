import { afterEach, beforeAll, describe, expect, jest, spyOn, test } from 'bun:test';
import type { User } from './data';
import { UserService } from './service';
import { UserController } from './controller';
import type { UserRepository } from './repository';
import { Router } from '@glass-cannon/router';
import { AuthMiddleware } from '../auth/middleware';
import { AuthService } from '../auth/service';
import type { AuthRepository } from '../auth/repository';
import type { PermissionRepository } from '../permission/repository';
import { PermissionService } from '../permission/service';
import type { Config as AuthConfig } from '../auth/config';
import { Logger } from '@codeduel-backend-crab/logger';

describe('Route.User.Controller', () => {
  let service: UserService;
  let authService: AuthService;
  let controller: UserController;
  let router: Router;
  const mockUser: User = {
    id: 3,
    username: 'ceasar',
    name: 'Giuglio Cesare',
    avatar: 'pic.io/avatar.png',
    backgroundImage: 'pic.io/cover.png',
    biography: 'the best',
    createdAt: new Date('2023-10-01T12:00:00Z').toString(),
    updatedAt: new Date('2023-10-01T12:00:00Z').toString(),
  };
  const mockUsers: User[] = [
    {
      id: 1,
      username: 'albert',
      createdAt: new Date().toString(),
      updatedAt: new Date().toString(),
    },
    {
      id: 2,
      username: 'berta',
      createdAt: new Date().toString(),
      updatedAt: new Date().toString(),
    },
    mockUser,
    { id: 4, username: 'dora', createdAt: new Date().toString(), updatedAt: new Date().toString() },
  ];

  const authConfig = {
    accessToken: {
      cookie: { name: 'access-token' },
    },
    refreshToken: {
      cookie: { name: 'refresh-token' },
    },
  } as AuthConfig;

  beforeAll(() => {
    const repository = {} as UserRepository;
    const authRepository = {} as AuthRepository;
    const permissionRepository = {} as PermissionRepository;
    const permissionService = new PermissionService(permissionRepository);
    authService = new AuthService(authRepository, permissionService, authConfig);
    const logger = Logger.create({ level: 'silent', serviceName: 'test' });
    service = new UserService(repository);
    controller = new UserController(service, new AuthMiddleware(authService), logger);
    router = Router.from(controller.setup());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return all the users', async () => {
    const allSpy = spyOn(service, 'all').mockResolvedValue(mockUsers);

    const response = await router.handle(new Request('http://localhost/', { method: 'GET' }));

    expect(allSpy).toHaveBeenCalledWith(expect.any(Object));
    expect(allSpy).toHaveBeenCalledTimes(1);

    expect(response.status).toEqual(200);
    expect(await response.json()).toEqual(mockUsers);
  });

  test('should return a user by username', async () => {
    const byUsernameSpy = spyOn(service, 'byUsername').mockResolvedValue(mockUser);

    const response = await router.handle(
      new Request(
        'http://localhost/?' + new URLSearchParams({ username: mockUser.username }).toString(),
        {
          method: 'GET',
        }
      )
    );

    expect(byUsernameSpy).toHaveBeenCalledWith(mockUser.username, expect.any(Object));
    expect(byUsernameSpy).toHaveBeenCalledTimes(1);

    expect(response.status).toEqual(200);
    expect(await response.json()).toEqual(mockUser);
  });

  test('should return a user by id', async () => {
    const byIdSpy = spyOn(service, 'byId').mockResolvedValue(mockUser);

    const response = await router.handle(
      new Request(`http://localhost/${mockUser.id}`, { method: 'GET' })
    );

    expect(byIdSpy).toHaveBeenCalledWith(mockUser.id, expect.any(Object));
    expect(byIdSpy).toHaveBeenCalledTimes(1);

    expect(response.status).toEqual(200);
    expect(await response.json()).toEqual(mockUser);
  });

  test('should return a user profile', async () => {
    const byIdSpy = spyOn(service, 'byId').mockResolvedValue(mockUser);
    const spyVerifySession = spyOn(authService, 'verifySession').mockResolvedValue({
      id: mockUser.id,
      username: mockUser.username,
      permissions: [],
    });

    const response = await router.handle(
      new Request('http://localhost/profile', {
        method: 'GET',
        headers: new Headers({ cookie: 'access-token=token_value' }),
      })
    );

    expect(byIdSpy).toHaveBeenCalledWith(mockUser.id, expect.any(Object));
    expect(byIdSpy).toHaveBeenCalledTimes(1);

    expect(spyVerifySession).toHaveBeenCalledWith('token_value', expect.any(Object));
    expect(spyVerifySession).toHaveBeenCalledTimes(1);

    expect(response.status).toEqual(200);
    expect(await response.json()).toEqual(mockUser);
  });
});
