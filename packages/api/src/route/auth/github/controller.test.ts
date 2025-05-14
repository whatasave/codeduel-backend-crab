import { afterEach, beforeAll, describe, expect, spyOn, test, jest } from 'bun:test';
import { GithubService } from './service';
import { AuthService } from '../service';
import type { AuthRepository } from '../repository';
import type { CookieOptions } from '../../../utils/cookie';
import type { Config as GithubConfig } from './config';
import type { Config as AuthConfig } from '../config';
import type { Auth } from '../data';
import type { User } from '../../user/data';
import type { GithubAccessToken, GithubUserData } from './data';
import { Router, type PathString } from '@codeduel-backend-crab/server';
import { GithubController } from './controller';

describe('Route.Auth.Github.Controller', () => {
  let service: GithubService;
  let authService: AuthService;
  let controller: GithubController;
  const config = {
    github: {
      stateCookie: { name: 'github-state-cookie' } as CookieOptions,
    } as GithubConfig,
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
    service = new GithubService(authService, config.github);
    controller = new GithubController(service, authService);
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
    const stateCookie = `${config.github.stateCookie.name}=${state}`;
    const authorizationUrl = 'github-login-url';
    const mockHeader = { 'user-agent': 'codeduel.it/1.0', 'x-forwarded-for': '9.11.69.420' };

    test('should redirect to github login page', async () => {
      const spyEncodeState = spyOn(authService, 'encodeState').mockReturnValue(state);
      const spyAuthorizationUrl = spyOn(service, 'authorizationUrl').mockReturnValue(
        authorizationUrl
      );
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

    test('should redirect to github login page with default user agent', async () => {});
  });

  describe('GET /callback', () => {
    const mockDate = new Date('2025-05-12T18:39:26.183Z').toString();
    const mockState = {
      redirect: 'redirect',
      ip: '9.11.69.420',
      userAgent: 'codeduel.it/1.0',
      csrfToken: 'csrf-token',
    };
    const mockToken: GithubAccessToken = {
      access_token: 'access_token',
      token_type: 'Bearer',
      scope: 'email:user',
    };
    const mockGithubUser = {
      id: 123456,
      login: 'toretto',
    } as GithubUserData;
    const mockAuth: Auth = {
      userId: 0,
      provider: 'github',
      providerId: mockGithubUser.id,
      createdAt: mockDate,
      updatedAt: mockDate,
    };
    const mockUser: User = {
      id: 0,
      username: mockGithubUser.login,
      createdAt: mockDate,
      updatedAt: mockDate,
    };
    const mockAccessToken = 'access-token';
    const mockRefreshToken = 'refresh-token';
    const mockStateString = 'state';
    const mockCode = 'code';
    const mockHeaders = {
      cookie: `${config.github.stateCookie.name}=${mockStateString}`,
    };
    test('should set the refresh and access token', async () => {
      const spyDecodeState = spyOn(authService, 'decodeState').mockReturnValue(mockState);
      const spyExchange = spyOn(service, 'exchangeCodeForToken').mockResolvedValue(mockToken);
      const spyUserData = spyOn(service, 'userData').mockResolvedValue(mockGithubUser);
      const spyCreate = spyOn(service, 'create').mockResolvedValue([mockAuth, mockUser]);
      const spyAccessToken = spyOn(authService, 'accessToken').mockResolvedValue(mockAccessToken);
      const spyRefreshToken = spyOn(authService, 'refreshToken').mockResolvedValue(
        mockRefreshToken
      );
      const spyCreateSession = spyOn(service, 'createSession').mockResolvedValue();

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

      expect(spyExchange).toHaveBeenCalledWith(mockCode, mockStateString);
      expect(spyExchange).toHaveBeenCalledTimes(1);

      expect(spyUserData).toHaveBeenCalledWith(mockToken.access_token);
      expect(spyUserData).toHaveBeenCalledTimes(1);

      expect(spyCreate).toHaveBeenCalledWith(mockGithubUser);
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
