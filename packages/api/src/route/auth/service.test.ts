import { afterEach, beforeAll, describe, expect, spyOn, test, jest } from 'bun:test';
import type { Database } from '@codeduel-backend-crab/database';
import { AuthRepository } from './repository';
import { AuthService } from './service';
import type { Config } from './config';
import { UserNameAlreadyExistsError, type CreateUser, type User } from '../user/data';
import type { Auth, AuthSession, CreateAuthSession, Provider, State } from './data';
import type { PermissionRepository } from '../permission/repository';
import { PermissionService } from '../permission/service';

describe('Route.Auth.Service', () => {
  let db: Database;
  let repository: AuthRepository;
  let service: AuthService;
  let permissionService: PermissionService;

  const config = {
    jwt: { issuer: 'issuer', audience: 'audience' },
    accessToken: { secret: 'access-token-secret', expiresIn: 3600 },
    refreshToken: { secret: 'refresh-token-secret', expiresIn: 86400 },
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
    const spyCreateIfNotExists = spyOn(repository, 'createIfNotExists').mockResolvedValue({
      auth: mockAuth,
      user: mockUser,
      permissions: [],
    });
    const { auth, user } = await service.createIfNotExists(mockProvider, mockCreateUser);

    expect(spyCreateIfNotExists).toHaveBeenCalledWith(mockProvider, mockCreateUser);
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
    const spyCreateIfNotExists = spyOn(repository, 'createIfNotExists').mockRejectedValue(
      new UserNameAlreadyExistsError(`Username already exists: ${mockCreateUser.username}`)
    );
    const spyCreate = spyOn(repository, 'create').mockResolvedValue({
      auth: mockAuth,
      user: mockUser,
      permissions: [],
    });
    const { auth, user } = await service.createForce(mockProvider, mockCreateUser);

    expect(spyCreateIfNotExists).toHaveBeenCalledWith(mockProvider, mockCreateUser);
    expect(spyCreateIfNotExists).toHaveBeenCalledTimes(1);

    expect(spyCreate).toHaveBeenCalledWith(mockProvider, {
      ...mockCreateUser,
      username: expect.stringContaining('-') as string,
    });
    expect(spyCreate).toHaveBeenCalledTimes(1);
    expect(auth).toEqual(mockAuth);
    expect(user).toEqual(mockUser);
  });

  test('should create access token', async () => {
    const mockUser = { id: 1, username: 'username' } as User;

    const token = await service.accessToken(mockUser, []);
    expect(token).toBeString();
    expect(token).toContain('.');
  });

  test('should create refresh token', async () => {
    const mockUser = { id: 1, username: 'username' } as User;
    const jti = 'jti';

    const token = await service.refreshToken(mockUser, jti);
    expect(token).toBeString();
    expect(token).toContain('.');
  });

  test('should verify access token', async () => {
    const mockUser = { id: 1, username: 'username' } as User;
    const token = await service.accessToken(mockUser, []);
    const decoded = await service.verifyAccessToken(token);

    expect(decoded).toBeDefined();
    expect(decoded).toMatchObject({
      iss: config.jwt.issuer,
      aud: config.jwt.audience,
      exp: expect.any(Number) as number,
      sub: mockUser.id,
      username: mockUser.username,
    });
  });

  test('should verify refresh token', async () => {
    const mockUser = { id: 1, username: 'username' } as User;
    const jti = 'jti';
    const token = await service.refreshToken(mockUser, jti);
    const decoded = await service.verifyRefreshToken(token);

    expect(decoded).toBeDefined();
    expect(decoded).toMatchObject({
      iss: config.jwt.issuer,
      aud: config.jwt.audience,
      exp: expect.any(Number) as number,
      jti,
      sub: mockUser.id,
    });
  });

  test('should delete session token id', async () => {
    const jti = 'jti';
    const spyDeleteSessionTokenId = spyOn(repository, 'deleteSessionTokenId').mockResolvedValue();

    await service.deleteSessionTokenId(jti);

    expect(spyDeleteSessionTokenId).toHaveBeenCalledWith(jti);
    expect(spyDeleteSessionTokenId).toHaveBeenCalledTimes(1);
  });

  test('should update session', async () => {
    const id = 1;
    const jti = 'jti';
    const spyUpdateSession = spyOn(repository, 'updateSession').mockResolvedValue();

    await service.updateSession(id, jti);

    expect(spyUpdateSession).toHaveBeenCalledWith(id, jti);
    expect(spyUpdateSession).toHaveBeenCalledTimes(1);
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

    expect(spyCreateSession).toHaveBeenCalledWith(mockCreateAuthSession);
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
});
