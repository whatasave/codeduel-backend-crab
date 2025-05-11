import { afterEach, beforeAll, describe, expect, jest, spyOn, test } from 'bun:test';
import type { User } from './data';
import { UserService } from './service';
import { UserController } from './controller';
import type { UserRepository } from './repository';
import { Router, type PathString } from '@codeduel-backend-crab/server';

describe('Route.User.Controller', () => {
  let serv: UserService;
  let controller: UserController;
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

  beforeAll(() => {
    const repo = {} as UserRepository;
    serv = new UserService(repo);
    controller = new UserController(serv);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should set up routes', async () => {
    const router = new Router();
    controller.setup(router.group({ prefix: '/' }));
    const routes = [...router.allRoutes()].map((r) => r.path);
    const expectedRoutes = ['/:id', '/', '/profile'].sort() as PathString[];

    expect(routes).toHaveLength(3);
    expect(routes.sort()).toEqual(expectedRoutes);
  });

  test('should return all the users', async () => {
    const allSpy = spyOn(serv, 'all').mockResolvedValue(mockUsers);

    const users = await controller.users.handler({
      method: 'GET',
      path: '/',
      query: {},
      params: {},
      body: undefined,
      headers: new Headers(),
    });

    expect(allSpy).toHaveBeenCalledWith();
    expect(allSpy).toHaveBeenCalledTimes(1);

    expect(users.status).toEqual(200);
    expect(users.headers).toBeUndefined();
    expect(users.body).toEqual(mockUsers);
  });

  test('should return a user by username', async () => {
    const byUsernameSpy = spyOn(serv, 'byUsername').mockResolvedValue(mockUser);

    const users = await controller.users.handler({
      method: 'GET',
      path: '/',
      query: { username: mockUser.username },
      params: {},
      body: undefined,
      headers: new Headers(),
    });

    expect(byUsernameSpy).toHaveBeenCalledWith(mockUser.username);
    expect(byUsernameSpy).toHaveBeenCalledTimes(1);

    expect(users.status).toEqual(200);
    expect(users.headers).toBeUndefined();
    expect(users.body).toEqual(mockUser);
  });

  test('should return a user by id', async () => {
    const byIdSpy = spyOn(serv, 'byId').mockResolvedValue(mockUser);

    const users = await controller.byId.handler({
      method: 'GET',
      path: '/:id',
      query: {},
      params: { id: mockUser.id },
      body: undefined,
      headers: new Headers(),
    });

    expect(byIdSpy).toHaveBeenCalledWith(mockUser.id);
    expect(byIdSpy).toHaveBeenCalledTimes(1);

    expect(users.status).toEqual(200);
    expect(users.headers).toBeUndefined();
    expect(users.body).toEqual(mockUser);
  });

  test('should return a user profile', async () => {
    const byId = spyOn(serv, 'byId').mockResolvedValue(mockUser);

    const users = await controller.profile.handler({
      method: 'GET',
      path: '/profile',
      query: {},
      params: {},
      body: undefined,
      headers: new Headers({
        authorization: 'Bearer token_value',
      }),
    });

    expect(byId).toHaveBeenCalledWith(mockUser.id);
    expect(byId).toHaveBeenCalledTimes(1);

    expect(users.status).toEqual(200);
    expect(users.headers).toBeUndefined();
    expect(users.body).toEqual(mockUser);
  });
});
