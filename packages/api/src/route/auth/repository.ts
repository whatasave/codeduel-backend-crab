import type { Database, Select } from '@codeduel-backend-crab/database';
import type { Auth, Provider } from './data';
import type { CreateUser, User } from '../user/data';
import { UserRepository } from '../user/repository';

export class AuthRepository {
  constructor(private readonly database: Database) {}

  async create(user: CreateUser, provider: Provider): Promise<[Auth, User]> {
    const authUser = await this.database.transaction().execute(async (tx) => {
      const userRepo = new UserRepository(tx);

      const newUser = await userRepo.create(user);
      if (!newUser) throw new Error('Failed to create user');

      const newAuth = await tx
        .insertInto('auth')
        .values({
          user_id: newUser.id,
          provider: provider.name,
          provider_id: provider.userId,
        })
        .returningAll()
        .executeTakeFirst();

      if (!newAuth) throw new Error('Failed to create auth');

      return [this.selectToAuth(newAuth), newUser] as [Auth, User];
    });

    return authUser;
  }

  async createIfNotExists(user: CreateUser, provider: Provider): Promise<[Auth, User]> {
    const authUser = await this.database.transaction().execute(async (tx) => {
      const userRepo = new UserRepository(tx);

      const existingAuth = await tx
        .selectFrom('auth')
        .selectAll()
        .where('provider', '=', provider.name)
        .where('provider_id', '=', provider.userId)
        .executeTakeFirst();

      if (existingAuth) {
        const existingUser = await userRepo.findById(existingAuth.user_id);
        if (!existingUser) throw new Error('Failed to find user');

        return [this.selectToAuth(existingAuth), existingUser] as [Auth, User];
      }

      return this.create(user, provider);
    });

    return authUser;
  }

  private selectToAuth(user: Select<'auth'>): Auth {
    return {
      userId: user.user_id,
      provider: user.provider,
      providerId: user.provider_id,
      createdAt: user.created_at.toISOString(),
      updatedAt: user.updated_at.toISOString(),
    };
  }
}
