import { createDatabase, type Database } from '@codeduel-backend-crab/database';
import type { CreateUser, User } from './data';
import { safeLoadConfig } from '../../config';

export class UserRepository {
  // constructor(private readonly context: Database) {}
  private context: Database;
  constructor() {
    const config = safeLoadConfig();
    if (config.error) throw new Error(config.error);

    const { config: dbConfig } = config;
    if (!dbConfig) throw new Error('Database config is not defined');

    this.context = createDatabase(dbConfig.database);
  }

  public async findAll(): Promise<User[]> {
    const users = await this.context.selectFrom('users').selectAll().execute();

    return users.map(
      (user) =>
        ({
          id: user.id,
          username: user.username,
          name: user.name ?? undefined,
          updatedAt: user.updatedAt.toISOString(),
          avatar: user.avatar ?? undefined,
          backgroundImage: user.backgroundImage ?? undefined,
          biography: user.biography ?? undefined,
          createdAt: user.createdAt.toISOString(),
        }) satisfies User
    );
  }

  public async findByUsername(username: User['username']): Promise<User | undefined> {
    const user = await this.context
      .selectFrom('users')
      .selectAll()
      .where('username', '=', username)
      .executeTakeFirst();

    if (!user) return undefined;

    return {
      id: user.id,
      username: user.username,
      name: user.name ?? undefined,
      updatedAt: user.updatedAt.toISOString(),
      avatar: user.avatar ?? undefined,
      backgroundImage: user.backgroundImage ?? undefined,
      biography: user.biography ?? undefined,
      createdAt: user.createdAt.toISOString(),
    } satisfies User;
  }

  public async findById(id: User['id']): Promise<User | undefined> {
    const user = await this.context
      .selectFrom('users')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!user) return undefined;

    return {
      id: user.id,
      username: user.username,
      name: user.name ?? undefined,
      updatedAt: user.updatedAt.toISOString(),
      avatar: user.avatar ?? undefined,
      backgroundImage: user.backgroundImage ?? undefined,
      biography: user.biography ?? undefined,
      createdAt: user.createdAt.toISOString(),
    } satisfies User;
  }

  public async create(user: CreateUser): Promise<User | undefined> {
    const [newUser] = await this.context
      .insertInto('users')
      .values({
        username: user.username,
        name: user.name,
        avatar: user.avatar,
        backgroundImage: user.backgroundImage,
        biography: user.biography,
      })
      .returningAll()
      .execute();

    if (!newUser) return undefined;

    return {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name ?? undefined,
      updatedAt: newUser.updatedAt.toISOString(),
      avatar: newUser.avatar ?? undefined,
      backgroundImage: newUser.backgroundImage ?? undefined,
      biography: newUser.biography ?? undefined,
      createdAt: newUser.createdAt.toISOString(),
    } satisfies User;
  }
}
