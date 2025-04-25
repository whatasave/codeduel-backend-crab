import { beforeAll, describe, expect, test } from 'bun:test';
import type { IUserRepository } from './repository';
import type { CreateUser, User } from './data';
import { UserService } from './service';

class MockUserRepository implements IUserRepository {
  users: User[] = [
    { id: 1, username: 'albert', createdAt: '', updatedAt: '' },
    { id: 2, username: 'berta', createdAt: '', updatedAt: '' },
    { id: 3, username: 'ceasar', createdAt: '', updatedAt: '' },
    { id: 4, username: 'dora', createdAt: '', updatedAt: '' },
  ];

  async all(): Promise<User[]> {
    return this.users;
  }

  async byUsername(username: User['username']): Promise<User | undefined> {
    return this.users.find((u) => u.username == username);
  }

  async byId(id: User['id']): Promise<User | undefined> {
    return this.users.find((u) => u.id == id);
  }

  async create(user: CreateUser): Promise<User> {
    return { ...user, id: 0, createdAt: '', updatedAt: '' };
  }
}

describe('Route.User.Services', () => {
  let repo: MockUserRepository;
  let serv: UserService;

  beforeAll(() => {
    repo = new MockUserRepository();
    serv = new UserService(repo);
  });

  test('all', async () => {
    const users = await serv.all();
    expect(users.length).toBe(repo.users.length);
    expect(users).toEqual(repo.users);
  });

  test('byUsername', async () => {
    const searchingUser = repo.users[2];
    if (!searchingUser) throw new Error('user not found');

    const user = await serv.byUsername(searchingUser.username);
    expect(user).toEqual(searchingUser);
  });

  test('byId', async () => {
    const searchingUser = repo.users[2];
    if (!searchingUser) throw new Error('user not found');

    const user = await serv.byId(searchingUser.id);
    expect(user).toEqual(searchingUser);
  });

  describe('should create user', () => {
    test('with only required attributes', async () => {
      const newUser = { username: 'fabio' } satisfies CreateUser;

      const savedUser = await serv.create(newUser);
      expect(savedUser.id).toBeNumber();
      expect(savedUser.username).toEqual(newUser.username);
    });

    test('with all attributes', async () => {
      const newUser = {
        username: 'fabio',
        name: 'Fabiano Desmond',
        avatar: 'pic.io/avatar.png',
        backgroundImage: 'pic.io/profile.png',
        biography: 'the best',
      } satisfies CreateUser;

      const savedUser = await serv.create(newUser);
      expect(savedUser.id).toBeNumber();
      expect(savedUser.username).toEqual(newUser.username);
      expect(savedUser.name).toEqual(newUser.name);
      expect(savedUser.avatar).toEqual(newUser.avatar);
      expect(savedUser.backgroundImage).toEqual(newUser.backgroundImage);
      expect(savedUser.biography).toEqual(newUser.biography);
    });
  });
});
