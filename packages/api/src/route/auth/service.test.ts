import { afterEach, beforeAll, describe, expect, spyOn, test, jest } from 'bun:test';

import type { Database } from '@codeduel-backend-crab/database';
import jwt from 'jsonwebtoken';

import type { PermissionRepository } from '@/route/permission/repository';
import { PermissionService } from '@/route/permission/service';
import { UserNameAlreadyExistsError, type CreateUser, type User } from '@/route/user/data';
import type { Cookies } from '@/utils/cookie';

import type { Config } from './config';
import type { Auth, AuthSession, CreateAuthSession, Provider, State } from './data';
import { AuthRepository } from './repository';
import { AuthService } from './service';

describe('Route.Auth.Service', () => {
  let db: Database;
  let repository: AuthRepository;
  let service: AuthService;
  let permissionService: PermissionService;

  const config = {
    jwt: { issuer: 'issuer', audience: 'audience' },
    accessToken: { secret: 'access-token-secret', expiresIn: 3600 },
    refreshToken: { secret: 'refresh-token-secret', expiresIn: 86400, cleanupInterval: 3600 },
    csrfToken: {
      secret: 'csrf-token-secret',
      headerName: 'X-CSRF-Token',
      cookie: { name: 'csrf-token', path: '/', httpOnly: true },
    },
    userDefaultRole: 'user',
  } as Config;

  beforeAll(() => {
    db = {} as Database;
    repository = new AuthRepository(db);
    const permissionRepository = {} as PermissionRepository;
    permissionService = new PermissionService(permissionRepository);
    service = new AuthService(repository, permissionService, config);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should create user if not exists else return existing user', async () => {
    const mockCreateUser: CreateUser = {
      username: 'username',
      name: 'name',
      avatar: 'pic.io/avatar.png',
      backgroundImage: 'pic.io/background.png',
      biography: 'biography',
    };
    const mockProvider: Provider = {
      userId: 0,
      name: 'provider-x',
    };
    const mockDate = new Date('2025-05-12T18:39:26.183Z').toString();
    const mockUser: User = {
      ...mockCreateUser,
      id: 1,
      createdAt: mockDate,
      updatedAt: mockDate,
    };
    const mockAuth: Auth = {
      userId: mockUser.id,
      provider: mockProvider.name,
      providerId: mockProvider.userId,
      createdAt: mockDate,
      updatedAt: mockDate,
    };
    const spyGetRoleByName = spyOn(permissionService, 'getRoleByName').mockResolvedValue({
      id: 1,
      name: 'user',
      createdAt: mockDate,
      updatedAt: mockDate,
    });
    const spyCreateIfNotExists = spyOn(repository, 'createIfNotExists').mockResolvedValue({
      auth: mockAuth,
      user: mockUser,
      permissions: [],
    });
    const { auth, user } = await service.createIfNotExists(mockProvider, mockCreateUser);

    expect(spyGetRoleByName).toHaveBeenCalledWith('user');
    expect(spyCreateIfNotExists).toHaveBeenCalledWith(mockProvider, mockCreateUser, 1, undefined);
    expect(spyCreateIfNotExists).toHaveBeenCalledTimes(1);
    expect(auth).toEqual(mockAuth);
    expect(user).toEqual(mockUser);
  });

  test('should create user forcefully', async () => {
    const mockCreateUser: CreateUser = {
      username: 'username',
      name: 'name',
      avatar: 'pic.io/avatar.png',
      backgroundImage: 'pic.io/background.png',
      biography: 'biography',
    };
    const mockProvider: Provider = {
      userId: 0,
      name: 'provider-x',
    };
    const mockDate = new Date('2025-05-12T18:39:26.183Z').toString();
    const mockUser: User = {
      ...mockCreateUser,
      id: 1,
      createdAt: mockDate,
      updatedAt: mockDate,
    };
    const mockAuth: Auth = {
      userId: mockUser.id,
      provider: mockProvider.name,
      providerId: mockProvider.userId,
      createdAt: mockDate,
      updatedAt: mockDate,
    };
    spyOn(permissionService, 'getRoleByName').mockResolvedValue({
      id: 1,
      name: 'user',
      createdAt: mockDate,
      updatedAt: mockDate,
    });
    const spyCreateIfNotExists = spyOn(repository, 'createIfNotExists').mockRejectedValue(
      new UserNameAlreadyExistsError(`Username already exists: ${mockCreateUser.username}`)
    );
    const spyCreate = spyOn(repository, 'create').mockResolvedValue({
      auth: mockAuth,
      user: mockUser,
      permissions: [],
    });
    const { auth, user } = await service.createForce(mockProvider, mockCreateUser);

    expect(spyCreateIfNotExists).toHaveBeenCalledWith(mockProvider, mockCreateUser, 1, undefined);
    expect(spyCreateIfNotExists).toHaveBeenCalledTimes(1);

    expect(spyCreate).toHaveBeenCalledWith(
      mockProvider,
      {
        ...mockCreateUser,
        username: expect.stringContaining('-') as string,
      },
      1,
      undefined
    );
    expect(spyCreate).toHaveBeenCalledTimes(1);
    expect(auth).toEqual(mockAuth);
    expect(user).toEqual(mockUser);
  });

  test('should create access token', async () => {
    const mockUser = { id: 1, username: 'username' } as User;

    const token = await service.accessToken(mockUser, [], 42);
    expect(token).toBeString();
    expect(token).toContain('.');
  });

  test('should create refresh token', async () => {
    const mockUser = { id: 1, username: 'username' } as User;
    const jti = 'jti';

    const token = await service.refreshToken(mockUser, 42, jti);
    expect(token).toBeString();
    expect(token).toContain('.');
  });

  test('should verify access token', async () => {
    const mockUser = { id: 1, username: 'username' } as User;
    const token = await service.accessToken(mockUser, [], 42);
    const decoded = await service.verifyAccessToken(token);

    expect(decoded).toBeDefined();
    expect(decoded).toMatchObject({
      iss: config.jwt.issuer,
      aud: config.jwt.audience,
      exp: expect.any(Number) as number,
      sub: mockUser.id,
      username: mockUser.username,
      sid: 42,
    });
  });

  test('should reject an access token without session id', async () => {
    const token = jwt.sign(
      {
        iss: config.jwt.issuer,
        aud: config.jwt.audience,
        exp: Math.floor(Date.now() / 1000) + 60,
        sub: 1,
        username: 'username',
        permissions: [],
      },
      config.accessToken.secret,
      { algorithm: 'HS256' }
    );

    const error = await service.verifyAccessToken(token).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toEqual('Invalid token sid');
  });

  test('should verify refresh token', async () => {
    const mockUser = { id: 1, username: 'username' } as User;
    const jti = 'jti';
    const token = await service.refreshToken(mockUser, 42, jti);
    const decoded = await service.verifyRefreshToken(token);

    expect(decoded).toBeDefined();
    expect(decoded).toMatchObject({
      iss: config.jwt.issuer,
      aud: config.jwt.audience,
      exp: expect.any(Number) as number,
      jti,
      sid: 42,
      sub: mockUser.id,
    });
  });

  test('should reject a refresh token without session id', async () => {
    const token = jwt.sign(
      {
        iss: config.jwt.issuer,
        aud: config.jwt.audience,
        exp: Math.floor(Date.now() / 1000) + 60,
        jti: 'jti',
        sub: 1,
      },
      config.refreshToken.secret,
      { algorithm: 'HS256' }
    );

    const error = await service.verifyRefreshToken(token).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toEqual('Invalid token sid');
  });

  test('should rotate refresh token', async () => {
    const now = Date.parse('2025-05-12T18:00:00.000Z');
    const exp = Math.floor(now / 1000) + 60;
    const token = { iss: 'issuer', aud: 'audience', exp, jti: 'old-jti', sid: 42, sub: 1 };
    const spyRotate = spyOn(repository, 'rotateRefreshToken').mockResolvedValue({
      status: 'invalid',
    });

    const result = await service.rotateRefreshToken(token, 'new-jti', now);

    expect(spyRotate).toHaveBeenCalledWith(
      {
        sessionId: 42,
        tokenId: 'old-jti',
        newTokenId: 'new-jti',
        newExpiresAt: '2025-05-13T18:00:00.000Z',
      },
      undefined
    );
    expect(spyRotate).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: 'invalid' });
  });

  test('should compute refresh token expiration matching the exp claim', async () => {
    const now = Date.now();
    const token = await service.refreshToken({ id: 1 } as User, 42, 'jti', now);
    const { exp } = await service.verifyRefreshToken(token);

    expect(service.refreshTokenExpiresAt(now)).toBe(new Date(exp * 1000).toISOString());
  });

  test('should delete expired tokens', async () => {
    const now = Date.parse('2025-05-12T18:00:00.000Z');
    const spyDeleteExpired = spyOn(repository, 'deleteExpiredTokens').mockResolvedValue({
      sessions: 2,
    });

    const result = await service.deleteExpiredTokens(now);

    expect(spyDeleteExpired).toHaveBeenCalledWith('2025-05-12T18:00:00.000Z');
    expect(result).toEqual({ sessions: 2 });
  });

  test('should schedule token cleanup and stop it', async () => {
    const spyDeleteExpired = spyOn(repository, 'deleteExpiredTokens').mockResolvedValue({
      sessions: 0,
    });

    const stop = service.scheduleTokenCleanup();
    stop();

    expect(spyDeleteExpired).toHaveBeenCalledTimes(1);
  });

  test('should get session by token id', async () => {
    const jti = 'jti';
    const mockSession = { id: 1, tokenId: jti } as AuthSession;
    const spySessionByTokenId = spyOn(repository, 'sessionByTokenId').mockResolvedValue(
      mockSession
    );

    const session = await service.sessionByTokenId(jti);

    expect(spySessionByTokenId).toHaveBeenCalledWith(jti);
    expect(spySessionByTokenId).toHaveBeenCalledTimes(1);
    expect(session).toEqual(mockSession);
  });

  test('should delete session', async () => {
    const id = 1;
    const spyDeleteSession = spyOn(repository, 'deleteSession').mockResolvedValue();

    await service.deleteSession(id);

    expect(spyDeleteSession).toHaveBeenCalledWith(id);
    expect(spyDeleteSession).toHaveBeenCalledTimes(1);
  });

  test('should create session', async () => {
    const mockCreateAuthSession: CreateAuthSession = {
      userId: 1,
      tokenId: 'token-id',
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      provider: 'provider-name',
    };
    const mockAuthSession: AuthSession = {
      id: 1,
      userId: mockCreateAuthSession.userId,
      tokenId: mockCreateAuthSession.tokenId,
      provider: mockCreateAuthSession.provider,
      createdAt: new Date().toString(),
      updatedAt: new Date().toString(),
    };
    const spyCreateSession = spyOn(repository, 'createSession').mockResolvedValue(mockAuthSession);

    const result = await service.createSession(mockCreateAuthSession);

    expect(spyCreateSession).toHaveBeenCalledWith(
      { ...mockCreateAuthSession, expiresAt: expect.any(String) as string },
      undefined
    );
    expect(spyCreateSession).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockAuthSession);
  });

  test('should encode/decode state', () => {
    const mockState: State = {
      csrfToken: 'csrf-token',
      redirect: 'https://example.com/redirect',
    };
    const encodedState = service.encodeState(mockState);
    expect(encodedState).toBeString();
    expect(encodedState).toMatch(/^[A-Za-z0-9_-]+$/);

    const decodedState = service.decodeState(encodedState);
    expect(decodedState).toEqual(mockState);
    expect(decodedState).toMatchObject({
      csrfToken: mockState.csrfToken,
      redirect: mockState.redirect,
    });
  });

  describe('csrf token', () => {
    test('should derive a stable token per session', () => {
      expect(service.csrfToken(1)).toEqual(service.csrfToken(1));
      expect(service.csrfToken(1)).not.toEqual(service.csrfToken(2));
      expect(service.csrfToken(1)).toMatch(/^[A-Za-z0-9_-]{43}$/);
    });

    test('should depend on the secret', () => {
      const otherService = new AuthService(repository, permissionService, {
        ...config,
        csrfToken: { ...config.csrfToken, secret: 'other-secret' },
      });
      expect(otherService.csrfToken(1)).not.toEqual(service.csrfToken(1));
    });

    function csrfRequest(header?: string, cookie?: string): [Headers, Cookies] {
      const headers = new Headers();
      if (header !== undefined) headers.set('X-CSRF-Token', header);
      return [headers, cookie !== undefined ? { 'csrf-token': cookie } : {}];
    }

    test('should accept matching header and cookie bound to the session', () => {
      const token = service.csrfToken(1);
      expect(service.submittedCsrfToken(...csrfRequest(token, token))).toEqual(token);
      expect(service.isCsrfTokenBound(1, token)).toBeTrue();
      expect(service.verifyCsrfRequest(...csrfRequest(token, token), 1)).toBeTrue();
    });

    test('should reject missing or mismatching header and cookie', () => {
      const token = service.csrfToken(1);
      expect(service.submittedCsrfToken(...csrfRequest(undefined, token))).toBeUndefined();
      expect(service.submittedCsrfToken(...csrfRequest(token, undefined))).toBeUndefined();
      expect(service.submittedCsrfToken(...csrfRequest('', ''))).toBeUndefined();
      expect(service.submittedCsrfToken(...csrfRequest(token, `${token}x`))).toBeUndefined();
      expect(service.submittedCsrfToken(...csrfRequest(token, 'short'))).toBeUndefined();
      expect(service.verifyCsrfRequest(...csrfRequest(undefined, token), 1)).toBeFalse();
    });

    test('should reject a token bound to another session', () => {
      const foreign = service.csrfToken(2);
      expect(service.isCsrfTokenBound(1, foreign)).toBeFalse();
      expect(service.isCsrfTokenBound(1, `${foreign}x`)).toBeFalse();
      expect(service.verifyCsrfRequest(...csrfRequest(foreign, foreign), 1)).toBeFalse();
    });

    test('should always expose the csrf cookie to javascript', () => {
      expect(service.csrfTokenCookieOptions.httpOnly).toBeFalse();
      const [, , csrfCookie] = service.sessionCookies({
        accessToken: 'a',
        refreshToken: 'r',
        sessionId: 1,
      });
      expect(csrfCookie).toEqual(`csrf-token=${service.csrfToken(1)}; Path=/`);
    });
  });
});
