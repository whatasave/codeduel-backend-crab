import { type Database } from '@codeduel-backend-crab/database';
import type { CreateUser, User } from './data';

export class UserRepository {
  constructor(private readonly database: Database) {}

  public async findAll(): Promise<User[]> {
    const users = await this.database.selectFrom('users').selectAll().execute();

    return users.map((user) => {
      return {
        id: user.id,
        username: user.username,
        name: user.name ?? undefined,
        updatedAt: user.updated_at.toISOString(),
        avatar: user.avatar ?? undefined,
        backgroundImage: user.background_image ?? undefined,
        biography: user.biography ?? undefined,
        createdAt: user.created_at.toISOString(),
      } satisfies User;
    });
  }

  public async findByUsername(username: User['username']): Promise<User | undefined> {
    const user = await this.database
      .selectFrom('users')
      .selectAll()
      .where('username', '=', username)
      .executeTakeFirst();

    if (!user) return undefined;

    return {
      id: user.id,
      username: user.username,
      name: user.name ?? undefined,
      updatedAt: user.updated_at.toISOString(),
      avatar: user.avatar ?? undefined,
      backgroundImage: user.background_image ?? undefined,
      biography: user.biography ?? undefined,
      createdAt: user.created_at.toISOString(),
    } satisfies User;
  }

  public async findById(id: User['id']): Promise<User | undefined> {
    const user = await this.database
      .selectFrom('users')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!user) return undefined;

    return {
      id: user.id,
      username: user.username,
      name: user.name ?? undefined,
      updatedAt: user.updated_at.toISOString(),
      avatar: user.avatar ?? undefined,
      backgroundImage: user.background_image ?? undefined,
      biography: user.biography ?? undefined,
      createdAt: user.created_at.toISOString(),
    } satisfies User;
  }

  public async create(user: CreateUser): Promise<User | undefined> {
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

    return {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name ?? undefined,
      updatedAt: newUser.updated_at.toISOString(),
      avatar: newUser.avatar ?? undefined,
      backgroundImage: newUser.background_image ?? undefined,
      biography: newUser.biography ?? undefined,
      createdAt: newUser.created_at.toISOString(),
    } satisfies User;
  }
}
