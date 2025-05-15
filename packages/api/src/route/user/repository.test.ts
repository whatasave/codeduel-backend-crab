import { afterEach, beforeAll, describe, expect, jest, test } from 'bun:test';
import { UserRepository } from './repository';
import type { CreateUser, User } from './data';
import type { Database } from '@codeduel-backend-crab/database';
import { setupTestDatabase } from '../../utils/test';

describe('Route.User.Repository', () => {
  let db: Database;
  let repository: UserRepository;
  const mockUser: User = {
    id: 3,
    username: 'ceasar',
    name: 'Giuglio Cesare',
    avatar: 'pic.io/avatar.png',
    backgroundImage: 'pic.io/cover.png',
    biography: 'the best',
    createdAt: new Date('2025-05-04T14:12:02.712Z').toString(),
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

  beforeAll(async () => {
    db = await setupTestDatabase();
    repository = new UserRepository(db);

    await db.transaction().execute(async (trx) => {
      await trx
        .insertInto('user')
        .values(
          mockUsers.map((user) => ({
            username: user.username,
            name: user.name,
            avatar: user.avatar,
            background_image: user.backgroundImage,
            biography: user.biography,
          }))
        )
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    test('should create new user', async () => {
      const user = {
        username: 'schumacher',
        name: 'Michael Schumacher',
        avatar: 'pic.io/avatar.png',
        backgroundImage: 'pic.io/cover.png',
        biography: 'the best',
      } satisfies CreateUser;

      const createdUser = await repository.create(user);
      expect(createdUser).toContainAnyKeys(['id', 'username', 'createdAt', 'updatedAt']);
      expect(createdUser).toMatchObject({
        username: user.username,
        name: user.name,
        avatar: user.avatar,
        backgroundImage: user.backgroundImage,
        biography: user.biography,
        updatedAt: createdUser.createdAt,
      });
    });

    test('should throw error if username already exists', async () => {
      const user = {
        username: mockUser.username,
        name: 'Michael Schumacher',
        avatar: 'pic.io/avatar.png',
        backgroundImage: 'pic.io/cover.png',
        biography: 'the best',
      } satisfies CreateUser;

      expect(repository.create(user)).rejects.toThrowError();
    });
  });

  test('should return all users', async () => {
    const users = await repository.all();
    expect(users).toBeArray();
    expect(users).toBeArrayOfSize(5);

    for (const user of users) {
      expect(user).toContainAllKeys([
        'name',
        'avatar',
        'backgroundImage',
        'biography',
        'id',
        'username',
        'createdAt',
        'updatedAt',
      ]);
    }
  });

  describe('byId', () => {
    test('should return user by id', async () => {
      const user = await repository.byId(mockUser.id);
      expect(user).toMatchObject({
        id: mockUser.id,
        username: mockUser.username,
        name: mockUser.name,
        avatar: mockUser.avatar,
        backgroundImage: mockUser.backgroundImage,
        biography: mockUser.biography,
      });
    });

    test('should return undefined if user with `id` does not exist', async () => {
      const user = await repository.byId(99);
      expect(user).toBeUndefined();
    });
  });

  describe('byUsername', () => {
    test('should return user by username', async () => {
      const user = await repository.byUsername(mockUser.username);
      expect(user).toMatchObject({
        id: mockUser.id,
        username: mockUser.username,
        name: mockUser.name,
        avatar: mockUser.avatar,
        backgroundImage: mockUser.backgroundImage,
        biography: mockUser.biography,
      });
    });

    test('should return undefined if user with `username` does not exist', async () => {
      const user = await repository.byUsername('non-existing');
      expect(user).toBeUndefined();
    });

    test('should return user by username with case insensitive', async () => {
      const user = await repository.byUsername('CEASAR');
      expect(user).toMatchObject({
        id: mockUser.id,
        username: mockUser.username,
        name: mockUser.name,
        avatar: mockUser.avatar,
        backgroundImage: mockUser.backgroundImage,
        biography: mockUser.biography,
      });
    });
  });
});
