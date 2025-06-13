import { afterEach, beforeAll, describe, expect, spyOn, test, jest } from 'bun:test';
import { GithubService } from './service';
import { AuthService } from '../service';
import type { AuthRepository } from '../repository';
import type { CookieOptions } from '../../../utils/cookie';
import type { Config as GithubConfig } from './config';
import type { Config as AuthConfig } from '../config';
import type { Auth, AuthSession, CreateAuthSession } from '../data';
import type { User } from '../../user/data';
import type { GithubAccessToken, GithubUserData } from './data';
import type { PermissionRepository } from '../../permission/repository';
import { PermissionService } from '../../permission/service';

describe('Route.Auth.Github.Service', () => {
  let authService: AuthService;
  let permissionService: PermissionService;
  let service: GithubService;
  const config = {
    github: {
      clientId: 'github-client-id',
      clientSecret: 'github-client-secret',
      redirectUri: 'github-redirect-uri',
      stateCookie: { name: 'github-state-cookie' } as CookieOptions,
    } as GithubConfig,
  } as AuthConfig;

  beforeAll(() => {
    const authRepository = {} as AuthRepository;
    const permissionRepository = {} as PermissionRepository;
    permissionService = new PermissionService(permissionRepository);
    authService = new AuthService(authRepository, permissionService, config);
    service = new GithubService(authService, config.github);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    test('should create even if name not provided', async () => {
      const mockDate = new Date('2025-05-12T18:39:26.183Z').toString();
      const mockGithubUserData = {
        login: 'username',
        avatar_url: 'pic.io/avatar.png',
      } as GithubUserData;
      const mockUser = {
        id: 1,
        username: mockGithubUserData.login,
        name: mockGithubUserData.login,
        avatar: mockGithubUserData.avatar_url,
        createdAt: mockDate,
        updatedAt: mockDate,
      } as User;
      const mockAuth = {
        userId: mockUser.id,
        provider: 'github',
        createdAt: mockDate,
        updatedAt: mockDate,
      } as Auth;
      const spyCreateForce = spyOn(authService, 'createForce').mockResolvedValue({
        auth: mockAuth,
        user: mockUser,
        permissions: [],
      });
      const { auth, user } = await service.create(mockGithubUserData);

      expect(spyCreateForce).toHaveBeenCalledWith(
        { name: 'github', userId: mockGithubUserData.id },
        {
          username: mockGithubUserData.login,
          name: mockGithubUserData.login,
          avatar: mockGithubUserData.avatar_url,
        }
      );
      expect(spyCreateForce).toHaveBeenCalledTimes(1);
      expect(auth).toEqual(mockAuth);
      expect(user).toEqual(mockUser);
    });

    test('should create name provided', async () => {
      const mockDate = new Date('2025-05-12T18:39:26.183Z').toString();
      const mockGithubUserData = {
        login: 'username',
        name: 'name',
        avatar_url: 'pic.io/avatar.png',
      } as GithubUserData;
      const mockUser = {
        id: 1,
        username: mockGithubUserData.login,
        name: mockGithubUserData.name,
        avatar: mockGithubUserData.avatar_url,
        createdAt: mockDate,
        updatedAt: mockDate,
      } as User;
      const mockAuth = {
        userId: mockUser.id,
        provider: 'github',
        createdAt: mockDate,
        updatedAt: mockDate,
      } as Auth;
      const spyCreateForce = spyOn(authService, 'createForce').mockResolvedValue({
        auth: mockAuth,
        user: mockUser,
        permissions: [],
      });
      const { auth, user } = await service.create(mockGithubUserData);

      expect(spyCreateForce).toHaveBeenCalledWith(
        { name: 'github', userId: mockGithubUserData.id },
        {
          username: mockGithubUserData.login,
          name: mockGithubUserData.name,
          avatar: mockGithubUserData.avatar_url,
        }
      );
      expect(spyCreateForce).toHaveBeenCalledTimes(1);
      expect(auth).toEqual(mockAuth);
      expect(user).toEqual(mockUser);
    });
  });

  test('should return access token by exchanging the code', async () => {
    const mockCode = 'code';
    const mockState = 'state';
    const mockResponse = {
      access_token: 'access-token',
      token_type: 'bearer',
      scope: 'read:user,user:email',
    } as GithubAccessToken;

    const spyExchangeCodeForTokenFetch = spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => mockResponse,
    } as Response);

    const accessToken = await service.exchangeCodeForToken(mockCode, mockState);

    expect(spyExchangeCodeForTokenFetch).toHaveBeenCalledWith(
      'https://github.com/login/oauth/access_token',
      expect.objectContaining({
        headers: {
          'User-Agent': 'codeduel.it/1.0',
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: config.github.clientId,
          client_secret: config.github.clientSecret,
          code: mockCode,
          state: mockState,
        }),
      })
    );
    expect(spyExchangeCodeForTokenFetch).toHaveBeenCalledTimes(1);
    expect(accessToken).toEqual(mockResponse);
  });

  test('should fetch user data from github', async () => {
    const mockAccessToken = 'access-token';
    const mockResponse = { login: 'username', avatar_url: 'pic.io/avatar.pn' } as GithubUserData;
    const spyUserDataFetch = spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => mockResponse,
    } as Response);

    const userData = await service.userData(mockAccessToken);

    expect(spyUserDataFetch).toHaveBeenCalledWith(
      'https://api.github.com/user',
      expect.objectContaining({
        headers: {
          'User-Agent': 'codeduel.it/1.0',
          Accept: 'application/json',
          Authorization: `Bearer ${mockAccessToken}`,
        },
      })
    );
    expect(spyUserDataFetch).toHaveBeenCalledTimes(1);
    expect(userData).toEqual(mockResponse);
  });

  test('should create authorizationUrl', async () => {
    const mockStateString = JSON.stringify({
      csrfToken: 'csrf-token',
      redirect: 'http://localhost:3000',
      ip: '::1',
      userAgent: 'codeduel.it/1.0',
    });
    const authUrl = service.authorizationUrl(mockStateString);

    expect(authUrl).toEqual(
      `https://github.com/login/oauth/authorize?client_id=${config.github.clientId}&redirect_uri=${
        config.github.redirectUri
      }&scope=read%3Auser%2Cuser%3Aemail&state=${encodeURIComponent(
        mockStateString
      )}&allow_signup=false`
    );
  });

  test('should create session', async () => {
    const mockCreateSession = {
      userId: 1,
      tokenId: 'refresh-1',
      ip: '::1',
      userAgent: 'codeduel.it/1.0',
      provider: 'github',
    } satisfies CreateAuthSession;

    const spyCreateSession = spyOn(authService, 'createSession').mockResolvedValue(
      {} as unknown as AuthSession
    );
    await service.createSession(
      mockCreateSession.userId,
      mockCreateSession.tokenId,
      mockCreateSession.ip,
      mockCreateSession.userAgent
    );

    expect(spyCreateSession).toHaveBeenCalledWith(mockCreateSession);
    expect(spyCreateSession).toHaveBeenCalledTimes(1);
  });
});
