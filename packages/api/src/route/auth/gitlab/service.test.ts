import { afterEach, beforeAll, describe, expect, spyOn, test, jest } from 'bun:test';
import { GitlabService } from './service';
import { AuthService } from '../service';
import type { AuthRepository } from '../repository';
import type { CookieOptions } from '../../../utils/cookie';
import type { Config as GitlabConfig } from './config';
import type { Config as AuthConfig } from '../config';
import type { Auth, AuthSession, CreateAuthSession } from '../data';
import type { User } from '../../user/data';
import type { GitlabAccessToken, GitlabUserData } from './data';
import { PermissionService } from '../../permission/service';
import type { PermissionRepository } from '../../permission/repository';

describe('Route.Auth.Gitlab.Service', () => {
  let authService: AuthService;
  let permissionService: PermissionService;
  let service: GitlabService;
  const config = {
    gitlab: {
      applicationId: 'gitlab-app-id',
      secret: 'gitlab-client-secret',
      callbackUri: 'gitlab-redirect-uri',
      stateCookie: { name: 'gitlab-state-cookie' } as CookieOptions,
    } as GitlabConfig,
  } as AuthConfig;

  beforeAll(() => {
    const authRepository = {} as AuthRepository;
    const permissionRepository = {} as PermissionRepository;
    permissionService = new PermissionService(permissionRepository);
    authService = new AuthService(authRepository, permissionService, config);
    service = new GitlabService(authService, config.gitlab);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    test('should create even if name not provided', async () => {
      const mockDate = new Date('2025-05-12T18:39:26.183Z').toString();
      const mockGitlabUserData = {
        username: 'username',
        avatar_url: 'pic.io/avatar.png',
      } as GitlabUserData;
      const mockUser = {
        id: 1,
        username: mockGitlabUserData.username,
        name: mockGitlabUserData.username,
        avatar: mockGitlabUserData.avatar_url,
        createdAt: mockDate,
        updatedAt: mockDate,
      } as User;
      const mockAuth = {
        userId: mockUser.id,
        provider: 'gitlab',
        createdAt: mockDate,
        updatedAt: mockDate,
      } as Auth;
      const spyCreateForce = spyOn(authService, 'createForce').mockResolvedValue({
        auth: mockAuth,
        user: mockUser,
        permissions: [],
      });
      const { auth, user } = await service.create(mockGitlabUserData);

      expect(spyCreateForce).toHaveBeenCalledWith(
        { name: 'gitlab', userId: mockGitlabUserData.id },
        {
          username: mockGitlabUserData.username,
          name: mockGitlabUserData.username,
          avatar: mockGitlabUserData.avatar_url,
        }
      );
      expect(spyCreateForce).toHaveBeenCalledTimes(1);
      expect(auth).toEqual(mockAuth);
      expect(user).toEqual(mockUser);
    });

    test('should create name provided', async () => {
      const mockDate = new Date('2025-05-12T18:39:26.183Z').toString();
      const mockGitlabUserData = {
        username: 'username',
        name: 'name',
        avatar_url: 'pic.io/avatar.png',
      } as GitlabUserData;
      const mockUser = {
        id: 1,
        username: mockGitlabUserData.username,
        name: mockGitlabUserData.name,
        avatar: mockGitlabUserData.avatar_url,
        createdAt: mockDate,
        updatedAt: mockDate,
      } as User;
      const mockAuth = {
        userId: mockUser.id,
        provider: 'gitlab',
        createdAt: mockDate,
        updatedAt: mockDate,
      } as Auth;
      const spyCreateForce = spyOn(authService, 'createForce').mockResolvedValue({
        auth: mockAuth,
        user: mockUser,
        permissions: [],
      });
      const { auth, user } = await service.create(mockGitlabUserData);

      expect(spyCreateForce).toHaveBeenCalledWith(
        { name: 'gitlab', userId: mockGitlabUserData.id },
        {
          username: mockGitlabUserData.username,
          name: mockGitlabUserData.name,
          avatar: mockGitlabUserData.avatar_url,
        }
      );
      expect(spyCreateForce).toHaveBeenCalledTimes(1);
      expect(auth).toEqual(mockAuth);
      expect(user).toEqual(mockUser);
    });
  });

  test('should return access token by exchanging the code', async () => {
    const mockCode = 'code';
    const mockResponse = {
      access_token: 'access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'refresh-token',
      created_at: Math.floor(Date.now() / 1000),
    } as GitlabAccessToken;

    const spyExchangeCodeForTokenFetch = spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => mockResponse,
    } as Response);

    const accessToken = await service.exchangeCodeForToken(mockCode);

    expect(spyExchangeCodeForTokenFetch).toHaveBeenCalledWith(
      'https://gitlab.com/oauth/token',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'User-Agent': 'codeduel.it/1.0',
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: config.gitlab.applicationId,
          client_secret: config.gitlab.secret,
          code: mockCode,
          grant_type: 'authorization_code',
          redirect_uri: config.gitlab.callbackUri,
        }),
      })
    );
    expect(spyExchangeCodeForTokenFetch).toHaveBeenCalledTimes(1);
    expect(accessToken).toEqual(mockResponse);
  });

  test('should fetch user data from gitlab', async () => {
    const mockAccessToken = 'access-token';
    const mockResponse = { username: 'username', avatar_url: 'pic.io/avatar.pn' } as GitlabUserData;
    const spyUserDataFetch = spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => mockResponse,
    } as Response);

    const userData = await service.userData(mockAccessToken);

    expect(spyUserDataFetch).toHaveBeenCalledWith(
      'https://gitlab.com/api/v4/user',
      expect.objectContaining({
        method: 'GET',
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
      `https://gitlab.com/oauth/authorize?client_id=${config.gitlab.applicationId}&redirect_uri=${
        config.gitlab.callbackUri
      }&response_type=code&state=${encodeURIComponent(mockStateString)}&scope=api+read_user+profile`
    );
  });

  test('should create session', async () => {
    const mockCreateSession: CreateAuthSession = {
      userId: 1,
      tokenId: 'refresh-1',
      ip: '::1',
      userAgent: 'codeduel.it/1.0',
      provider: 'gitlab',
    };

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
