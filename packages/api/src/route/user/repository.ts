import { type Database, type Select } from '@codeduel-backend-crab/database';
import { type CreateUser, type User } from './data';

export class UserRepository {
  constructor(private readonly database: Database) {}

  async all(): Promise<User[]> {
    const users = await this.database.selectFrom('user').selectAll().execute();

    return users.map(UserRepository.selectToUser.bind(this));
  }

  async byUsername(username: User['username']): Promise<User | undefined> {
    const user = await this.database
      .selectFrom('user')
      .selectAll()
      .where('username', '=', username.toLowerCase())
      .executeTakeFirst();

    if (!user) return undefined;

    return UserRepository.selectToUser(user);
  }

  async byId(id: User['id']): Promise<User | undefined> {
    const user = await this.database
      .selectFrom('user')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!user) return undefined;

    return UserRepository.selectToUser(user);
  }

  async create(user: CreateUser): Promise<User> {
    const newUser = await this.database
      .insertInto('user')
      .values({
        username: user.username,
        name: user.name,
        avatar: user.avatar,
        background_image: user.backgroundImage,
        biography: user.biography,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return UserRepository.selectToUser(newUser);
  }

  static selectToUser(user: Select<'user'>): User {
    return {
      id: user.id,
      username: user.username,
      name: user.name ?? undefined,
      updatedAt: user.updated_at,
      avatar: user.avatar ?? undefined,
      backgroundImage: user.background_image ?? undefined,
      biography: user.biography ?? undefined,
      createdAt: user.created_at,
    };
  }
}
