import type { Logger } from '@codeduel-backend-crab/logger';

import type { CreateUser, User, UserListItem } from './data';
import type { UserRepository } from './repository';

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async all(logger?: Logger): Promise<User[]> {
    const users = await this.userRepository.all();
    logger?.debug('all.success', 'fetched users', { count: users.length });
    return users;
  }

  async list(logger?: Logger): Promise<UserListItem[]> {
    const users = await this.all(logger);
    return users.map((user) => UserService.toListItem(user));
  }

  static toListItem(user: User): UserListItem {
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      avatar: user.avatar,
      createdAt: user.createdAt,
    };
  }

  async byUsername(username: User['username'], logger?: Logger): Promise<User | undefined> {
    const user = await this.userRepository.byUsername(username);
    if (!user) logger?.debug('byUsername.notFound', 'user not found', { username });
    return user;
  }

  async byId(id: User['id'], logger?: Logger): Promise<User | undefined> {
    const user = await this.userRepository.byId(id);
    if (!user) logger?.debug('byId.notFound', 'user not found', { userId: id });
    return user;
  }

  async create(user: CreateUser, logger?: Logger): Promise<User> {
    const created = await this.userRepository.create(user);
    logger?.info('create.success', 'user created', {
      userId: created.id,
      username: created.username,
    });
    return created;
  }
}
