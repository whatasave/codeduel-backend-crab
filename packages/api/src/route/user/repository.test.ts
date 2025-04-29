import { beforeAll, describe, expect, spyOn, test } from 'bun:test';
import { UserRepository } from './repository';
import type { CreateUser, User } from './data';
import type { Database } from '@codeduel-backend-crab/database';

// defaults?: Partial<DefaultData<NewPost>>
// defaultData: DefaultData<Insertable<Post>>

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

  beforeAll(() => {
    db = createMock();
    repo = new UserRepository(db);
  });

  test('should create user', () => {});

  describe('should find', () => {
    test('all users', () => {});

    test('user by id', () => {});

    test('user by username', () => {});
  });
});
