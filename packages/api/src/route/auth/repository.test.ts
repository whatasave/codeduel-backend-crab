import { afterEach, beforeAll, describe, expect, jest, test } from 'bun:test';

import type { Database } from '@codeduel-backend-crab/database';

import type { CreateUser, User } from '@/route/user/data';
import { setupTestDatabase } from '@/utils/test';

import type { Auth, AuthSession, CreateAuthSession, Provider } from './data';
import { AuthRepository } from './repository';

describe('Route.Auth.Repository', () => {
  let db: Database;
  let repository: AuthRepository;

  const mockDate = new Date('2025-05-12T18:39:26.183Z').toISOString();
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const pastDate = new Date(Date.now() - 60 * 1000).toISOString();
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

      await trx.insertInto('role').values({ id: 1, name: 'user' }).executeTakeFirstOrThrow();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('auth', () => {
    test('should create a new authUser when it does not exist', async () => {
      const provider: Provider = { name: 'px', userId: 444 };
      const newUser: CreateUser = { username: 'first-login' };
      const created = await repository.createIfNotExists(provider, newUser, 1);
      const existing = await repository.createIfNotExists(provider, newUser, 1);

      expect(created.auth.userId).toEqual(created.user.id);
      expect(created.user.username).toEqual(newUser.username);
      expect(existing).toEqual(created);
    });

    test('should create user and auth', async () => {
      const newUser: CreateUser = {
        username: 'newuser',
        name: 'New User',
        avatar: '',
        backgroundImage: '',
        biography: '',
      };
      const newProvider: Provider = { name: 'px', userId: 333 };
      const { auth, user } = await repository.create(newProvider, newUser, 1);

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

    test('should return the existing authUser', async () => {
      const exUser = mockUsers[0];
      const exAuth = mockAuths[0];

      if (!exUser || !exAuth) throw new Error('Mock data is not set up correctly');
      const exProvider: Provider = { name: exAuth.provider, userId: exAuth.providerId };

      const { auth, user } = await repository.createIfNotExists(exProvider, exUser, 1);

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

    test('should rotate session refresh token', async () => {
      if (!newSession.tokenId) throw new Error('Mock data is not set up correctly');
      const session = await repository.sessionByTokenId(newSession.tokenId);

      if (!session) throw new Error('Session not found');
      const result = await repository.rotateRefreshToken({
        tokenId: newSession.tokenId,
        expiresAt: futureDate,
        newTokenId,
        newExpiresAt: futureDate,
      });

      expect(result).toMatchObject({ status: 'rotated', session: { id: session.id } });
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
      expect(await repository.sessionByTokenId(newSession.tokenId)).toBeUndefined();
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

  describe('refresh token rotation', () => {
    const exUser = mockUsers[1];
    const exAuth = mockAuths[1];
    if (!exUser || !exAuth) throw new Error('Mock data is not set up correctly');

    const createSession = (tokenId: string, expiresAt = futureDate): Promise<AuthSession> =>
      repository.createSession({
        userId: exUser.id,
        tokenId,
        provider: exAuth.provider,
        expiresAt,
      });
    const rotate = (
      tokenId: string,
      newTokenId: string
    ): ReturnType<AuthRepository['rotateRefreshToken']> =>
      repository.rotateRefreshToken({
        tokenId,
        expiresAt: futureDate,
        newTokenId,
        newExpiresAt: futureDate,
      });
    const usedTokens = (sessionId: number): Promise<string[]> =>
      db
        .selectFrom('auth_used_refresh_token')
        .select('token_id')
        .where('session_id', '=', sessionId)
        .orderBy('used_at')
        .execute()
        .then((rows) => rows.map((row) => row.token_id));

    test('should store expiration on session creation', async () => {
      const session = await createSession('rot-exp-a');
      expect(Date.parse(session.expiresAt ?? '')).toBe(Date.parse(futureDate));
    });

    test('should keep legacy sessions usable until their first rotation', async () => {
      const session = await repository.createSession({
        userId: exUser.id,
        tokenId: 'rot-legacy',
        provider: exAuth.provider,
      });

      await repository.deleteExpiredTokens(new Date().toISOString());
      const result = await rotate('rot-legacy', 'rot-legacy-new');

      expect(result).toMatchObject({ status: 'rotated', session: { id: session.id } });
      const current = await repository.sessionByTokenId('rot-legacy-new');
      expect(Date.parse(current?.expiresAt ?? '')).toBe(Date.parse(futureDate));
    });

    test('should invalidate the used token and remember it', async () => {
      const session = await createSession('rot-a1');

      const first = await rotate('rot-a1', 'rot-a2');
      const second = await rotate('rot-a2', 'rot-a3');

      expect(first).toMatchObject({ status: 'rotated', session: { id: session.id } });
      expect(second).toMatchObject({ status: 'rotated', session: { tokenId: 'rot-a3' } });
      expect(await usedTokens(session.id)).toEqual(['rot-a1', 'rot-a2']);
      expect(await repository.sessionByTokenId('rot-a1')).toBeUndefined();
      expect(await repository.sessionByTokenId('rot-a3')).toMatchObject({ id: session.id });
    });

    test('should revoke the whole session when a used token is presented again', async () => {
      const session = await createSession('rot-b1');
      const other = await createSession('rot-c1');
      await rotate('rot-b1', 'rot-b2');
      await rotate('rot-b2', 'rot-b3');

      const result = await rotate('rot-b1', 'rot-b4');

      expect(result).toEqual({ status: 'reused', sessionId: session.id, userId: exUser.id });
      expect(await repository.sessionByTokenId('rot-b3')).toBeUndefined();
      expect(await repository.sessionByTokenId('rot-b4')).toBeUndefined();
      expect(await usedTokens(session.id)).toEqual([]);
      expect(await rotate('rot-b3', 'rot-b5')).toEqual({ status: 'invalid' });
      expect(await repository.sessionByTokenId('rot-c1')).toMatchObject({ id: other.id });
    });

    test('should return invalid for unknown tokens', async () => {
      expect(await rotate('rot-unknown', 'rot-unknown-2')).toEqual({ status: 'invalid' });
      expect(await repository.sessionByTokenId('rot-unknown-2')).toBeUndefined();
    });

    test('should rotate only once when the same token is used concurrently', async () => {
      await createSession('rot-d1');

      const results = await Promise.all([rotate('rot-d1', 'rot-d2'), rotate('rot-d1', 'rot-d3')]);
      const statuses = results.map((r) => r.status).sort();

      expect(statuses).toEqual(['reused', 'rotated']);
      expect(await repository.sessionByTokenId('rot-d2')).toBeUndefined();
      expect(await repository.sessionByTokenId('rot-d3')).toBeUndefined();
    });

    test('should clear the session token and expiration on logout', async () => {
      await createSession('rot-e1');
      await repository.deleteSessionTokenId('rot-e1');

      expect(await repository.sessionByTokenId('rot-e1')).toBeUndefined();
      expect(await rotate('rot-e1', 'rot-e2')).toEqual({ status: 'invalid' });
    });

    test('should revoke the session on logout if refresh has already rotated the token', async () => {
      const session = await createSession('rot-logout');
      await rotate('rot-logout', 'rot-logout-new');

      await repository.deleteSessionTokenId('rot-logout');

      expect(await repository.sessionByTokenId('rot-logout-new')).toBeUndefined();
      expect(await usedTokens(session.id)).toEqual([]);
    });

    test('should delete expired tokens', async () => {
      const expired = await createSession('rot-f1', pastDate);
      const valid = await createSession('rot-g1');
      await db
        .insertInto('auth_used_refresh_token')
        .values([
          { token_id: 'rot-g0-expired', session_id: valid.id, expires_at: pastDate },
          { token_id: 'rot-g0-valid', session_id: valid.id, expires_at: futureDate },
        ])
        .execute();

      const result = await repository.deleteExpiredTokens(new Date().toISOString());

      expect(result.sessions).toBeGreaterThanOrEqual(1);
      expect(result.usedTokens).toBeGreaterThanOrEqual(1);
      expect(await repository.sessionByTokenId('rot-f1')).toBeUndefined();
      expect(
        await db
          .selectFrom('auth_session')
          .select(['token_id', 'expires_at'])
          .where('id', '=', expired.id)
          .executeTakeFirst()
      ).toEqual({ token_id: null, expires_at: null });
      expect(await repository.sessionByTokenId('rot-g1')).toMatchObject({ id: valid.id });
      expect(await usedTokens(valid.id)).toEqual(['rot-g0-valid']);
    });
  });
});
