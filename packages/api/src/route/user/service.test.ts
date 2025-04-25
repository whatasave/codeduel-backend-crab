import { beforeAll, describe, expect, spyOn, test } from 'bun:test';
import { UserRepository } from './repository';
import type { CreateUser, User } from './data';
import { UserService } from './service';
import type { Database } from '@codeduel-backend-crab/database';

describe('Route.User.Services', () => {
  let db: Database;
  let repo: UserRepository;
  let serv: UserService;
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

  beforeAll(() => {
    db = {} as Database;
    repo = new UserRepository(db);
    serv = new UserService(repo);
  });

  test('should return all the users', async () => {
    const spyAll = spyOn(repo, 'all').mockResolvedValue(fakeUsers);
    const users = await serv.all();

    expect(spyAll).toHaveBeenCalledWith();
    expect(spyAll).toHaveBeenCalledTimes(1);
    expect(users).toEqual(fakeUsers);
  });

  test('should return a user with the same username', async () => {
    const spyByUsername = spyOn(repo, 'byUsername').mockResolvedValue(fakeUser);
    const user = await serv.byUsername(fakeUser.username);

    expect(spyByUsername).toHaveBeenCalledWith(fakeUser.username);
    expect(spyByUsername).toHaveBeenCalledTimes(1);
    expect(user).toEqual(fakeUser);
  });

  test('should return the user with the same id', async () => {
    const spyById = spyOn(repo, 'byId').mockResolvedValue(fakeUser);
    const user = await serv.byId(fakeUser.id);

    expect(spyById).toHaveBeenCalledWith(fakeUser.id);
    expect(spyById).toHaveBeenCalledTimes(1);
    expect(user).toEqual(fakeUser);
  });

  describe('should create user', () => {
    test('with only required attributes', async () => {
      const newUser = { username: fakeUser.username } satisfies CreateUser;
      const spyCreate = spyOn(repo, 'create').mockResolvedValue(fakeUser);
      const savedUser = await serv.create(newUser);

      expect(spyCreate).toHaveBeenCalledWith(newUser);
      expect(spyCreate).toHaveBeenCalledTimes(1);

      expect(savedUser.id).toBeNumber();
      expect(savedUser.username).toEqual(newUser.username);
    });

    test('with all attributes', async () => {
      const newUser = {
        username: fakeUser.username,
        name: fakeUser.name,
        avatar: fakeUser.avatar,
        backgroundImage: fakeUser.backgroundImage,
        biography: fakeUser.biography,
      } satisfies CreateUser;

      const savedUser = await serv.create(newUser);
      expect(savedUser.id).toBeNumber();
      expect(savedUser).toEqual(fakeUser);
    });
  });
});
