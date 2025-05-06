import { beforeAll, describe, expect, test } from 'bun:test';
import { UserRepository } from './repository';
import type { CreateUser, User } from './data';
import type { Database } from '@codeduel-backend-crab/database';
import { setupTestDatabase } from '../../utils/test';

describe('Route.User.Repository', () => {
  let db: Database;
  let repo: UserRepository;
  const fakeUser = {
    id: 3,
    username: 'ceasar',
    name: 'Giuglio Cesare',
    avatar: 'pic.io/avatar.png',
    backgroundImage: 'pic.io/cover.png',
    biography: 'the best',
    createdAt: new Date('2025-05-04T14:12:02.712Z').toString(),
    updatedAt: new Date('2023-10-01T12:00:00Z').toString(),
  } as User;
  const fakeUsers = [
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
    fakeUser,
    { id: 4, username: 'dora', createdAt: new Date().toString(), updatedAt: new Date().toString() },
  ] as User[];

  beforeAll(async () => {
    db = await setupTestDatabase();
    repo = new UserRepository(db);

    await db.transaction().execute(async (trx) => {
      await trx
        .insertInto('user')
        .values(
          fakeUsers.map((user) => ({
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

  describe('create', () => {
    test('should create new user', async () => {
      const user = {
        username: 'schumacher',
        name: 'Michael Schumacher',
        avatar: 'pic.io/avatar.png',
        backgroundImage: 'pic.io/cover.png',
        biography: 'the best',
      } satisfies CreateUser;

      const createdUser = await repo.create(user);
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
        username: fakeUser.username,
        name: 'Michael Schumacher',
        avatar: 'pic.io/avatar.png',
        backgroundImage: 'pic.io/cover.png',
        biography: 'the best',
      } satisfies CreateUser;

      expect(repo.create(user)).rejects.toThrowError();
    });
  });

  test('should return all users', async () => {
    const users = await repo.all();
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
      const user = await repo.byId(fakeUser.id);
      expect(user).toMatchObject({
        id: fakeUser.id,
        username: fakeUser.username,
        name: fakeUser.name,
        avatar: fakeUser.avatar,
        backgroundImage: fakeUser.backgroundImage,
        biography: fakeUser.biography,
      });
    });

    test('should return undefined if user with `id` does not exist', async () => {
      const user = await repo.byId(99);
      expect(user).toBeUndefined();
    });
  });

  describe('byUsername', () => {
    test('should return user by username', async () => {
      const user = await repo.byUsername(fakeUser.username);
      expect(user).toMatchObject({
        id: fakeUser.id,
        username: fakeUser.username,
        name: fakeUser.name,
        avatar: fakeUser.avatar,
        backgroundImage: fakeUser.backgroundImage,
        biography: fakeUser.biography,
      });
    });

    test('should return undefined if user with `username` does not exist', async () => {
      const user = await repo.byUsername('non-existing');
      expect(user).toBeUndefined();
    });

    test('should return user by username with case insensitive', async () => {
      const user = await repo.byUsername('CEASAR');
      expect(user).toMatchObject({
        id: fakeUser.id,
        username: fakeUser.username,
        name: fakeUser.name,
        avatar: fakeUser.avatar,
        backgroundImage: fakeUser.backgroundImage,
        biography: fakeUser.biography,
      });
    });
  });
});
