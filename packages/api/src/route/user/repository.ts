import { type Database, type Select } from '@codeduel-backend-crab/database';
import type { CreateUser, User } from './data';

export class UserRepository {
  constructor(private readonly database: Database) {}

  async findAll(): Promise<User[]> {
    const users = await this.database.selectFrom('users').selectAll().execute();

    return users.map(this.selectToUser.bind(this));
  }

  async findByUsername(username: User['username']): Promise<User | undefined> {
    const user = await this.database
      .selectFrom('users')
      .selectAll()
      .where('username', '=', username)
      .executeTakeFirst();

    if (!user) return undefined;

    return this.selectToUser(user);
  }

  async findById(id: User['id']): Promise<User | undefined> {
    const user = await this.database
      .selectFrom('users')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!user) return undefined;

    return this.selectToUser(user);
  }

  async create(user: CreateUser): Promise<User | undefined> {
    const [newUser] = await this.database
      .insertInto('users')
      .values({
        username: user.username,
        name: user.name,
        avatar: user.avatar,
        background_image: user.backgroundImage,
        biography: user.biography,
      })
      .returningAll()
      .execute();

    if (!newUser) return undefined;

    return this.selectToUser(newUser);
  }

  private selectToUser(user: Select<'users'>): User {
    return {
      id: user.id,
      username: user.username,
      name: user.name ?? undefined,
      updatedAt: user.updated_at.toISOString(),
      avatar: user.avatar ?? undefined,
      backgroundImage: user.background_image ?? undefined,
      biography: user.biography ?? undefined,
      createdAt: user.created_at.toISOString(),
    };
  }
}
