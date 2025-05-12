import type { Database, Select } from '@codeduel-backend-crab/database';
import type { Auth, AuthSession, CreateAuthSession, Provider } from './data';
import { UserNameAlreadyExistsError, type CreateUser, type User } from '../user/data';
import { UserRepository } from '../user/repository';

export class AuthRepository {
  constructor(private readonly database: Database) {}

  async create(provider: Provider, user: CreateUser): Promise<[Auth, User]> {
    const authUser = await this.database.transaction().execute(async (tx) => {
      const userRepo = new UserRepository(tx);

      const existingUser = await tx
        .selectFrom('user')
        .selectAll()
        .where('username', '=', user.username)
        .executeTakeFirst();
      if (existingUser) throw new UserNameAlreadyExistsError(user.username);

      const newUser = await userRepo.create(user);

      const newAuth = await tx
        .insertInto('auth')
        .values({
          user_id: newUser.id,
          provider: provider.name,
          provider_id: provider.userId,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return [this.selectToAuth(newAuth), newUser] as [Auth, User];
    });

    return authUser;
  }

  async createIfNotExists(provider: Provider, user: CreateUser): Promise<[Auth, User]> {
    const authUser = await this.database.transaction().execute(async (tx) => {
      const userRepo = new UserRepository(tx);

      const existingAuth = await tx
        .selectFrom('auth')
        .selectAll()
        .where('provider', '=', provider.name)
        .where('provider_id', '=', provider.userId)
        .executeTakeFirst();

      if (existingAuth) {
        const existingUser = await userRepo.byId(existingAuth.user_id);
        if (!existingUser) throw new Error('Failed to find user');

        return [this.selectToAuth(existingAuth), existingUser] as [Auth, User];
      }

      return this.create(provider, user);
    });

    return authUser;
  }

  async createSession(session: CreateAuthSession): Promise<AuthSession> {
    const newSession = await this.database
      .insertInto('auth_session')
      .values({
        user_id: session.userId,
        token_id: session.tokenId,
        ip: session.ip,
        user_agent: session.userAgent,
        provider: session.provider,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return this.selectToSession(newSession);
  }

  async updateSession(id: AuthSession['id'], tokenId: AuthSession['tokenId']): Promise<void> {
    await this.database
      .updateTable('auth_session')
      .set({ token_id: tokenId })
      .where('id', '=', id)
      .executeTakeFirstOrThrow();
  }

  async sessionByToken(
    tokenId: Exclude<AuthSession['tokenId'], undefined>
  ): Promise<AuthSession | undefined> {
    const session = await this.database
      .selectFrom('auth_session')
      .selectAll()
      .where('token_id', '=', tokenId)
      .executeTakeFirst();

    return session && this.selectToSession(session);
  }

  async deleteSession(id: number): Promise<void> {
    await this.database.deleteFrom('auth_session').where('id', '=', id).executeTakeFirstOrThrow();
  }

  async deleteSessionToken(tokenId: Exclude<AuthSession['tokenId'], undefined>): Promise<void> {
    await this.database
      .updateTable('auth_session')
      .set({ token_id: null })
      .where('token_id', '=', tokenId)
      .executeTakeFirstOrThrow();
  }

  private selectToSession(authSession: Select<'auth_session'>): AuthSession {
    return {
      id: authSession.id,
      userId: authSession.user_id,
      tokenId: authSession.token_id ?? undefined,
      ip: authSession.ip ?? undefined,
      userAgent: authSession.user_agent ?? undefined,
      provider: authSession.provider,
      createdAt: authSession.created_at.toISOString(),
      updatedAt: authSession.updated_at.toISOString(),
    };
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
