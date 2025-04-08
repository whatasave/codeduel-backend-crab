import { type Database, type Select } from '@codeduel-backend-crab/database';
import type { Auth, CreateAuth } from './data';

export class AuthRepository {
  constructor(private readonly database: Database) {}

  public async create(newProvider: CreateAuth): Promise<Auth | undefined> {
    const [auth] = await this.database
      .insertInto('auth')
      .values({
        user_id: newProvider.userId,
        provider: newProvider.provider,
        provider_id: newProvider.providerId,
      })
      .returningAll()
      .execute();

    if (!auth) return undefined;

    return {
      userId: auth.user_id,
      provider: auth.provider,
      providerId: auth.provider_id,
      createdAt: auth.created_at.toISOString(),
      updatedAt: auth.updated_at.toISOString(),
    };
  }

  public async byProvider(
    provider: Auth['provider'],
    providerId: Auth['providerId']
  ): Promise<Auth | undefined> {
    const auth = await this.database
      .selectFrom('auth')
      .selectAll()
      .where('provider', '=', provider)
      .where('provider_id', '=', providerId)
      .executeTakeFirst();

    if (!auth) return undefined;
    return this.selectToAuth(auth);
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

  public async delete(userId: Auth['userId']): Promise<void> {
    await this.database.deleteFrom('auth').where('user_id', '=', userId).execute();
  }
}
