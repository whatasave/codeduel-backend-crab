import { beforeAll, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { UserRepository } from './repository';
import type { CreateUser, User } from './data';
import { createMockDatabase, type Database } from '@codeduel-backend-crab/database';

// defaults?: Partial<DefaultData<NewUser>>
// defaultData: DefaultData<Insertable<User>>

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
    createdAt: '',
    updatedAt: '',
  } as User;
  const fakeUsers = [
    { id: 1, username: 'albert', createdAt: '', updatedAt: '' },
    { id: 2, username: 'berta', createdAt: '', updatedAt: '' },
    fakeUser,
    { id: 4, username: 'dora', createdAt: '', updatedAt: '' },
  ] as User[];

  beforeAll(async () => {
    db = await createMockDatabase();
    repo = new UserRepository(db);

    await db.transaction().execute(async (trx) => {
      await trx.insertInto('user').values(fakeUsers).execute();
    });
  });

  // describe('when creating', () => {
  test('should create new user', async () => {
    const user = {
      username: 'schumacher',
      name: 'Michael Schumacher',
      avatar: 'pic.io/avatar.png',
      backgroundImage: 'pic.io/cover.png',
      biography: 'the best',
    } satisfies CreateUser;

    const createdUser = await repo.create(user);
    expect(createdUser.id).toBeDefined();
    expect(createdUser.username).toEqual(user.username);
    expect(createdUser.name).toEqual(user.name);
    expect(createdUser.avatar).toEqual(user.avatar);
    expect(createdUser.backgroundImage).toEqual(user.backgroundImage);
    expect(createdUser.biography).toEqual(user.biography);
    expect(createdUser.createdAt).toBeDefined();
    expect(createdUser.updatedAt).toBeDefined();
    expect(createdUser.createdAt).toEqual(createdUser.updatedAt);
  });

  test('should throw error if username already exists', async () => {
    const user = {
      username: fakeUser.username,
      name: 'Michael Schumacher',
      avatar: 'pic.io/avatar.png',
      backgroundImage: 'pic.io/cover.png',
      biography: 'the best',
    } satisfies CreateUser;

    const createUserSpy = spyOn(repo, 'create');
    await repo.create(user);
    expect(createUserSpy).toHaveBeenCalledWith(user);
    expect(createUserSpy).toHaveBeenCalledTimes(1);
    expect(createUserSpy).toThrowError();
  });
  // });

  // describe('when searching', () => {
  test('should return all users', async () => {
    const users = await repo.all();
    console.log(users);
    expect(users).toEqual(fakeUsers);
  });

  test('shuld return user by id', async () => {
    const user = await repo.byId(fakeUser.id);
    expect(user).toEqual(fakeUser);
  });

  test('shuld return undefined if user with `id` does not exist', async () => {
    const user = await repo.byId(99);
    expect(user).toBeUndefined();
  });

  test('should return user by username', async () => {
    const user = await repo.byUsername(fakeUser.username);
    expect(user).toEqual(fakeUser);
  });

  test('should return undefined if user with `username` does not exist', async () => {
    const user = await repo.byUsername('non-existing');
    expect(user).toBeUndefined();
  });

  test('should return user by username with case insensitive', async () => {
    const user = await repo.byUsername('CEASAR');
    expect(user).toEqual(fakeUser);
  });
  // });
});
