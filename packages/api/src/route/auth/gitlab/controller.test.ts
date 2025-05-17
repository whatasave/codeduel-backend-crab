import { afterEach, beforeAll, describe, expect, spyOn, test, jest, beforeEach } from 'bun:test';
import { GitlabService } from './service';
import { AuthService } from '../service';
import type { AuthRepository } from '../repository';
import type { CookieOptions } from '../../../utils/cookie';
import type { Config as GitlabConfig } from './config';
import type { Config as AuthConfig } from '../config';
import type { Auth } from '../data';
import type { User } from '../../user/data';
import type { GitlabAccessToken, GitlabUserData } from './data';
import { Router, type PathString } from '@codeduel-backend-crab/server';
import { GitlabController } from './controller';

describe('Route.Auth.Gitlab.Controller', () => {
  let service: GitlabService;
  let authService: AuthService;
  let controller: GitlabController;
  const config = {
    gitlab: {
      stateCookie: { name: 'gitlab-state-cookie' } as CookieOptions,
    } as GitlabConfig,
    accessToken: {
      cookie: {
        name: 'access-token',
      } as CookieOptions,
    } as AuthConfig['accessToken'],
    refreshToken: {
      cookie: {
        name: 'refresh-token',
      } as CookieOptions,
    } as AuthConfig['refreshToken'],
  } as AuthConfig;

  beforeAll(() => {
    const authRepository = {} as AuthRepository;
    authService = new AuthService(authRepository, config);
    service = new GitlabService(authService, config.gitlab);
    controller = new GitlabController(service, authService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should set up routes', async () => {
    const router = new Router();
    controller.setup(router.group({ prefix: '/' }));
    const routes = [...router.allRoutes()].map((r) => r.path);
    const expectedRoutes = ['/', '/callback'].sort() as PathString[];

    expect(routes).toHaveLength(expectedRoutes.length);
    expect(routes.sort()).toEqual(expectedRoutes);
  });

  describe('GET /', () => {
    const redirectUrl = 'fe.codeduel.it';
    const state = 'state';
    const stateCookie = `${config.gitlab.stateCookie.name}=${state}`;
    const mockHeader = { 'user-agent': 'codeduel.it/1.0', 'x-forwarded-for': '9.11.69.420' };
    const authorizationUrl = 'gitlab-login-url';

    let spyEncodeState: ReturnType<typeof spyOn>;
    let spyAuthorizationUrl: ReturnType<typeof spyOn>;

    beforeEach(() => {
      spyEncodeState = spyOn(authService, 'encodeState').mockReturnValue(state);
      spyAuthorizationUrl = spyOn(service, 'authorizationUrl').mockReturnValue(authorizationUrl);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should redirects to gitlab login page', async () => {
      const response = await controller.login.handler({
        method: 'GET',
        path: '/',
        query: { redirect: redirectUrl },
        params: {},
        body: undefined,
        headers: new Headers(mockHeader),
      });

      expect(spyEncodeState).toHaveBeenCalledWith({
        csrfToken: expect.any(String) as unknown as string,
        redirect: redirectUrl,
        ip: mockHeader['x-forwarded-for'],
        userAgent: mockHeader['user-agent'],
      });
      expect(spyEncodeState).toHaveBeenCalledTimes(1);

      expect(spyAuthorizationUrl).toHaveBeenCalledWith(state);
      expect(spyAuthorizationUrl).toHaveBeenCalledTimes(1);

      expect(response.status).toEqual(307);
      if (!response.headers) throw new Error('Response headers are undefined');
      expect(response.headers.get('location')).toEqual(authorizationUrl);
      expect(response.headers.get('content-type')).toEqual('text/plain');
      expect(response.headers.get('set-cookie')).toEqual(stateCookie);
      expect(response.body).toEqual(`Redirecting to ${authorizationUrl}`);
    });

    test('should redirects without IP and User-Agent', async () => {
      await controller.login.handler({
        method: 'GET',
        path: '/',
        query: { redirect: redirectUrl },
        params: {},
        body: undefined,
        headers: new Headers({}),
      });

      expect(spyEncodeState).toHaveBeenCalledWith({
        csrfToken: expect.any(String) as unknown as string,
        redirect: redirectUrl,
        ip: undefined,
        userAgent: undefined,
      });
    });

    test('should redirects using x-real-ip header', async () => {
      const mockHeader = { 'x-real-ip': '9.11.69.420' };
      await controller.login.handler({
        method: 'GET',
        path: '/',
        query: { redirect: redirectUrl },
        params: {},
        body: undefined,
        headers: new Headers(mockHeader),
      });

      expect(spyEncodeState).toHaveBeenCalledWith({
        csrfToken: expect.any(String) as unknown as string,
        redirect: redirectUrl,
        ip: mockHeader['x-real-ip'],
        userAgent: undefined,
      });
    });

    test('should prioritizes x-real-ip over x-forwarded-for', async () => {
      const mockHeader = { 'x-real-ip': '9.11.69.420', 'x-forwarded-for': '9.11.69.421' };
      await controller.login.handler({
        method: 'GET',
        path: '/',
        query: { redirect: redirectUrl },
        params: {},
        body: undefined,
        headers: new Headers(mockHeader),
      });

      expect(spyEncodeState).toHaveBeenCalledWith({
        csrfToken: expect.any(String) as unknown as string,
        redirect: redirectUrl,
        ip: mockHeader['x-real-ip'],
        userAgent: undefined,
      });
    });

    test('should select correct IP from x-forwarded-for chain', async () => {
      const rightIp = '9.11.69.420';
      const mockHeader = { 'x-forwarded-for': `${rightIp},9.11.69.421,9.11.69.422` };
      await controller.login.handler({
        method: 'GET',
        path: '/',
        query: { redirect: redirectUrl },
        params: {},
        body: undefined,
        headers: new Headers(mockHeader),
      });

      expect(spyEncodeState).toHaveBeenCalledWith({
        csrfToken: expect.any(String) as unknown as string,
        redirect: redirectUrl,
        ip: rightIp,
        userAgent: undefined,
      });
    });
  });

  describe('GET /callback', () => {
    const mockDate = new Date('2025-05-12T18:39:26.183Z').toString();
    const mockState = {
      redirect: 'redirect',
      ip: '9.11.69.420',
      userAgent: 'codeduel.it/1.0',
      csrfToken: 'csrf-token',
    };
    const mockToken: GitlabAccessToken = {
      access_token: 'access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'refresh-token',
      created_at: Math.floor(Date.now() / 1000),
    };
    const mockGitlabUser = {
      id: 123456,
      username: 'toretto',
    } as GitlabUserData;
    const mockAuth: Auth = {
      userId: 0,
      provider: 'gitlab',
      providerId: mockGitlabUser.id,
      createdAt: mockDate,
      updatedAt: mockDate,
    };
    const mockUser: User = {
      id: 0,
      username: mockGitlabUser.username,
      createdAt: mockDate,
      updatedAt: mockDate,
    };
    const mockAccessToken = 'access-token';
    const mockRefreshToken = 'refresh-token';
    const mockStateString = 'state';
    const mockCode = 'code';
    const mockHeaders = {
      cookie: `${config.gitlab.stateCookie.name}=${mockStateString}`,
    };

    let spyDecodeState: ReturnType<typeof spyOn>;
    let spyExchange: ReturnType<typeof spyOn>;
    let spyUserData: ReturnType<typeof spyOn>;
    let spyCreate: ReturnType<typeof spyOn>;
    let spyAccessToken: ReturnType<typeof spyOn>;
    let spyRefreshToken: ReturnType<typeof spyOn>;
    let spyCreateSession: ReturnType<typeof spyOn>;

    beforeEach(() => {
      spyDecodeState = spyOn(authService, 'decodeState').mockReturnValue(mockState);
      spyExchange = spyOn(service, 'exchangeCodeForToken').mockResolvedValue(mockToken);
      spyUserData = spyOn(service, 'userData').mockResolvedValue(mockGitlabUser);
      spyCreate = spyOn(service, 'create').mockResolvedValue([mockAuth, mockUser]);
      spyAccessToken = spyOn(authService, 'accessToken').mockResolvedValue(mockAccessToken);
      spyRefreshToken = spyOn(authService, 'refreshToken').mockResolvedValue(mockRefreshToken);
      spyCreateSession = spyOn(service, 'createSession').mockResolvedValue();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should sets refresh and access token cookies correctly', async () => {
      const response = await controller.callback.handler({
        method: 'GET',
        path: '/callback',
        query: { code: mockCode, state: mockStateString },
        params: {},
        body: undefined,
        headers: new Headers(mockHeaders),
      });

      expect(spyDecodeState).toHaveBeenCalledWith(mockStateString);
      expect(spyDecodeState).toHaveBeenCalledTimes(1);

      expect(spyExchange).toHaveBeenCalledWith(mockCode);
      expect(spyExchange).toHaveBeenCalledTimes(1);

      expect(spyUserData).toHaveBeenCalledWith(mockToken.access_token);
      expect(spyUserData).toHaveBeenCalledTimes(1);

      expect(spyCreate).toHaveBeenCalledWith(mockGitlabUser);
      expect(spyCreate).toHaveBeenCalledTimes(1);

      expect(spyAccessToken).toHaveBeenCalledWith(mockUser);
      expect(spyAccessToken).toHaveBeenCalledTimes(1);

      expect(spyRefreshToken).toHaveBeenCalledWith(mockUser, expect.any(String));
      expect(spyRefreshToken).toHaveBeenCalledTimes(1);

      expect(spyCreateSession).toHaveBeenCalledWith(
        mockUser.id,
        expect.any(String),
        mockState.ip,
        mockState.userAgent
      );
      expect(spyCreateSession).toHaveBeenCalledTimes(1);

      expect(response.status).toEqual(307);
      if (!response.headers) throw new Error('Response headers are undefined');
      expect(response.headers.get('location')).toEqual(mockState.redirect);
      expect(response.headers.get('content-type')).toEqual('text/plain');
      expect(response.headers.get('set-cookie')).toEqual(
        `${config.accessToken.cookie.name}=${mockAccessToken}, ${config.refreshToken.cookie.name}=${mockRefreshToken}`
      );
      expect(response.body).toEqual(`Redirecting to ${mockState.redirect}`);
    });
  });
});
