import { afterEach, beforeAll, describe, expect, spyOn, test, jest } from 'bun:test';
import { UserRepository } from './repository';
import type { CreateUser, User } from './data';
import { UserService } from './service';
import type { Database } from '@codeduel-backend-crab/database';

describe('Route.User.Service', () => {
  let db: Database;
  let repository: UserRepository;
  let service: UserService;
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
    db = {} as Database;
    repository = new UserRepository(db);
    service = new UserService(repository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should return all the users', async () => {
    const spyAll = spyOn(repository, 'all').mockResolvedValue(mockUsers);
    const users = await service.all();

    expect(spyAll).toHaveBeenCalledWith();
    expect(spyAll).toHaveBeenCalledTimes(1);
    expect(users).toEqual(mockUsers);
  });

  test('should return a user with the same username', async () => {
    const spyByUsername = spyOn(repository, 'byUsername').mockResolvedValue(mockUser);
    const user = await service.byUsername(mockUser.username);

    expect(spyByUsername).toHaveBeenCalledWith(mockUser.username);
    expect(spyByUsername).toHaveBeenCalledTimes(1);
    expect(user).toEqual(mockUser);
  });

  test('should return the user with the same id', async () => {
    const spyById = spyOn(repository, 'byId').mockResolvedValue(mockUser);
    const user = await service.byId(mockUser.id);

    expect(spyById).toHaveBeenCalledWith(mockUser.id);
    expect(spyById).toHaveBeenCalledTimes(1);
    expect(user).toEqual(mockUser);
  });

  describe('should create user', () => {
    test('with only required attributes', async () => {
      const newUser = { username: mockUser.username } satisfies CreateUser;
      const spyCreate = spyOn(repository, 'create').mockResolvedValue(mockUser);
      const savedUser = await service.create(newUser);

      expect(spyCreate).toHaveBeenCalledWith(newUser);
      expect(spyCreate).toHaveBeenCalledTimes(1);
      expect(savedUser.id).toBeNumber();
      expect(savedUser.username).toEqual(newUser.username);
    });

    test('with all attributes', async () => {
      const newUser = {
        username: mockUser.username,
        name: mockUser.name,
        avatar: mockUser.avatar,
        backgroundImage: mockUser.backgroundImage,
        biography: mockUser.biography,
      } satisfies CreateUser;

      const spyCreate = spyOn(repository, 'create').mockResolvedValue(mockUser);
      const savedUser = await service.create(newUser);

      expect(spyCreate).toHaveBeenCalledWith(newUser);
      expect(spyCreate).toHaveBeenCalledTimes(1);
      expect(savedUser.id).toBeNumber();
      expect(savedUser).toEqual(mockUser);
    });
  });
});
