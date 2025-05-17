import { afterEach, beforeAll, describe, expect, jest, test } from 'bun:test';
import type { Database } from '@codeduel-backend-crab/database';
import { setupTestDatabase } from '../../utils/test';
import { AuthRepository } from './repository';
import type { Auth, AuthSession, CreateAuthSession, Provider } from './data';
import type { CreateUser, User } from '../user/data';

describe('Route.Auth.Repository', () => {
  let db: Database;
  let repository: AuthRepository;

  const mockDate = new Date('2025-05-12T18:39:26.183Z').toISOString();
  const mockAuths: Auth[] = [
    { userId: 1, provider: 'px', providerId: 11, createdAt: mockDate, updatedAt: mockDate },
    { userId: 2, provider: 'py', providerId: 22, createdAt: mockDate, updatedAt: mockDate },
  ] as const;
  const mockUsers: User[] = [
    { id: 1, username: 'username', createdAt: mockDate, updatedAt: mockDate },
    { id: 2, username: 'username2', createdAt: mockDate, updatedAt: mockDate },
  ] as const;
  const mockAuthSessions: AuthSession[] = [
    { id: 1, userId: 1, tokenId: 'jti1', provider: 'px', createdAt: mockDate, updatedAt: mockDate },
    { id: 2, userId: 2, tokenId: 'jti2', provider: 'py', createdAt: mockDate, updatedAt: mockDate },
  ] as const;

  beforeAll(async () => {
    db = await setupTestDatabase();
    repository = new AuthRepository(db);

    await db.transaction().execute(async (trx) => {
      await trx
        .insertInto('user')
        .values(
          mockUsers.map((user) => ({
            username: user.username,
            name: user.name,
            avatar: user.avatar,
            background_image: user.backgroundImage,
            biography: user.biography,
          }))
        )
        .returningAll()
        .executeTakeFirstOrThrow();

      await trx
        .insertInto('auth')
        .values(
          mockAuths.map((auth) => ({
            user_id: auth.userId,
            provider: auth.provider,
            provider_id: auth.providerId,
          }))
        )
        .returningAll()
        .executeTakeFirstOrThrow();

      await trx
        .insertInto('auth_session')
        .values(
          mockAuthSessions.map((session) => ({
            user_id: session.userId,
            token_id: session.tokenId,
            ip: session.ip,
            user_agent: session.userAgent,
            provider: session.provider,
          }))
        )
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('auth', () => {
    test('should create user and auth', async () => {
      const newUser: CreateUser = {
        username: 'newuser',
        name: 'New User',
        avatar: '',
        backgroundImage: '',
        biography: '',
      };
      const newProvider: Provider = { name: 'px', userId: 333 };
      const [auth, user] = await repository.create(newProvider, newUser);

      expect(auth).toMatchObject({
        userId: expect.any(Number) as number,
        provider: newProvider.name,
        providerId: newProvider.userId,
        createdAt: expect.any(String) as string,
        updatedAt: expect.any(String) as string,
      });

      expect(user).toMatchObject({
        id: expect.any(Number) as number,
        username: newUser.username,
        name: newUser.name,
        avatar: newUser.avatar,
        backgroundImage: newUser.backgroundImage,
        biography: newUser.biography,
        createdAt: expect.any(String) as string,
        updatedAt: expect.any(String) as string,
      });
    });

    test('should create authUser if it does not exist', async () => {
      const exUser = mockUsers[0];
      const exAuth = mockAuths[0];

      if (!exUser || !exAuth) throw new Error('Mock data is not set up correctly');
      const exProvider: Provider = { name: exAuth.provider, userId: exAuth.providerId };

      const [auth, user] = await repository.createIfNotExists(exProvider, exUser);

      expect(auth).toMatchObject({
        userId: exUser.id,
        provider: exAuth.provider,
        providerId: exAuth.providerId,
      });
      expect(user).toMatchObject({
        id: exUser.id,
        username: exUser.username,
      });
    });
  });

  describe('auth session', () => {
    const exUser = mockUsers[0];
    const exAuth = mockAuths[0];

    if (!exUser || !exAuth) throw new Error('Mock data is not set up correctly');
    const newSession: CreateAuthSession = {
      userId: exUser.id,
      tokenId: 'jti4',
      provider: exAuth.provider,
      ip: '127.0.0.1',
      userAgent: 'code-duel',
    };
    const newTokenId = 'jti5';

    test('should create session', async () => {
      const exUser = mockUsers[0];
      const exAuth = mockAuths[0];

      if (!exUser || !exAuth) throw new Error('Mock data is not set up correctly');
      const newSession: CreateAuthSession = {
        userId: exUser.id,
        tokenId: 'jti3',
        provider: exAuth.provider,
      };

      const createdSession = await repository.createSession(newSession);

      expect(createdSession).toMatchObject({
        id: expect.any(Number) as number,
        userId: newSession.userId,
        tokenId: newSession.tokenId,
        provider: newSession.provider,
        ip: undefined,
        userAgent: undefined,
        createdAt: expect.any(String) as string,
        updatedAt: expect.any(String) as string,
      });
    });

    test('should create session with ip and agent', async () => {
      const createdSession = await repository.createSession(newSession);

      expect(createdSession).toMatchObject({
        id: expect.any(Number) as number,
        userId: newSession.userId,
        tokenId: newSession.tokenId,
        provider: newSession.provider,
        ip: newSession.ip,
        userAgent: newSession.userAgent,
      });
    });

    test('should get session by token id', async () => {
      if (!newSession.tokenId) throw new Error('Mock data is not set up correctly');
      const session = await repository.sessionByTokenId(newSession.tokenId);

      expect(session).toMatchObject({
        // id: expect.any(Number) as number,
        userId: newSession.userId,
        tokenId: newSession.tokenId,
        provider: newSession.provider,
        ip: newSession.ip,
        userAgent: newSession.userAgent,
      });
    });

    test('should update session', async () => {
      if (!newSession.tokenId) throw new Error('Mock data is not set up correctly');
      const session = await repository.sessionByTokenId(newSession.tokenId);

      if (!session) throw new Error('Session not found');
      await repository.updateSession(session.id, newTokenId);

      const updatedSession = await repository.sessionByTokenId(newTokenId);
      expect(updatedSession).toMatchObject({
        tokenId: newTokenId,

        id: session.id,
        userId: session.userId,
        provider: session.provider,
        ip: session.ip,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
      });
    });

    test('should delete session', async () => {
      const session = await repository.sessionByTokenId(newTokenId);

      if (!session) throw new Error('Session not found');
      await repository.deleteSession(session.id);

      const deletedSession = await repository.sessionByTokenId(newTokenId);
      expect(deletedSession).toBeUndefined();
    });

    test('should delete session token id', async () => {
      const sessionToDelete = mockAuthSessions[0];
      if (sessionToDelete === undefined) throw new Error('Mock data is not set up correctly');

      const sessionId = sessionToDelete.id;
      const sessionTokenId = sessionToDelete.tokenId;
      if (!sessionTokenId) throw new Error('Mock data is not set up correctly');

      await repository.deleteSession(sessionId);

      const deletedSession = await repository.sessionByTokenId(sessionTokenId);
      expect(deletedSession).toBeUndefined();
    });
  });
});
