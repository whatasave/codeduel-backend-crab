import { afterEach, beforeAll, describe, expect, spyOn, test, jest, beforeEach } from 'bun:test';
import { GithubService } from './service';
import { AuthService } from '../service';
import type { AuthRepository } from '../repository';
import type { CookieOptions } from '../../../utils/cookie';
import type { Config as GithubConfig } from './config';
import type { Config as AuthConfig } from '../config';
import type { Auth } from '../data';
import type { User } from '../../user/data';
import type { GithubAccessToken, GithubUserData } from './data';
import { GithubController } from './controller';
import { Router } from '@glass-cannon/router';
import { typebox } from '@glass-cannon/typebox';
import { ReadableStream } from 'node:stream/web';
import { responseBodyToJson } from '../../../utils/stream';

describe('Route.Auth.Github.Controller', () => {
  let service: GithubService;
  let authService: AuthService;
  let controller: GithubController;
  let router: Router;
  const config = {
    github: {
      stateCookie: { name: 'github-state-cookie' } as CookieOptions,
    } as GithubConfig,
    accessToken: {
      cookie: { name: 'access-token' } as CookieOptions,
    },
    refreshToken: {
      cookie: { name: 'refresh-token' } as CookieOptions,
    },
  } as AuthConfig;

  beforeAll(() => {
    const authRepository = {} as AuthRepository;
    authService = new AuthService(authRepository, config);
    service = new GithubService(authService, config.github);
    controller = new GithubController(service, authService);
    router = new Router({
      fallback: () => {
        throw new Error('Route not handled');
      },
    });
    controller.setup(typebox(router));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    const redirectUrl = 'fe.codeduel.it';
    const state = 'state';
    const stateCookie = `${config.github.stateCookie.name}=${state}`;
    const mockHeader = { 'user-agent': 'codeduel.it/1.0', 'x-forwarded-for': '9.11.69.420' };
    const authorizationUrl = 'github-login-url';

    let spyEncodeState: ReturnType<typeof spyOn>;
    let spyAuthorizationUrl: ReturnType<typeof spyOn>;

    beforeEach(() => {
      spyEncodeState = spyOn(authService, 'encodeState').mockReturnValue(state);
      spyAuthorizationUrl = spyOn(service, 'authorizationUrl').mockReturnValue(authorizationUrl);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should redirects to github login page', async () => {
      const response = await router.handle({
        method: 'GET',
        url: new URL(
          'http://localhost/?' + new URLSearchParams({ redirect: redirectUrl }).toString()
        ),
        stream: new ReadableStream(),
        headers: new Headers(mockHeader),
      });

      expect(spyEncodeState).toHaveBeenCalledWith({
        csrfToken: expect.any(String) as string,
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
      expect(response.headers.get('set-cookie')).toEqual(stateCookie);
      expect(await responseBodyToJson(response.body)).toEqual(`Redirecting to ${authorizationUrl}`);
    });

    test('should redirects without IP and User-Agent', async () => {
      await router.handle({
        method: 'GET',
        url: new URL(
          'http://localhost/?' + new URLSearchParams({ redirect: redirectUrl }).toString()
        ),
        stream: new ReadableStream(),
        headers: new Headers(),
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
      await router.handle({
        method: 'GET',
        url: new URL(
          'http://localhost/?' + new URLSearchParams({ redirect: redirectUrl }).toString()
        ),
        stream: new ReadableStream(),
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
      await router.handle({
        method: 'GET',
        url: new URL(
          'http://localhost/?' + new URLSearchParams({ redirect: redirectUrl }).toString()
        ),
        stream: new ReadableStream(),
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
      await router.handle({
        method: 'GET',
        url: new URL(
          'http://localhost/?' + new URLSearchParams({ redirect: redirectUrl }).toString()
        ),
        stream: new ReadableStream(),
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
      spyUserData = spyOn(service, 'userData').mockResolvedValue(mockGithubUser);
      spyCreate = spyOn(service, 'create').mockResolvedValue([mockAuth, mockUser]);
      spyAccessToken = spyOn(authService, 'accessToken').mockResolvedValue(mockAccessToken);
      spyRefreshToken = spyOn(authService, 'refreshToken').mockResolvedValue(mockRefreshToken);
      spyCreateSession = spyOn(service, 'createSession').mockResolvedValue();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should sets refresh and access token cookies correctly', async () => {
      const response = await router.handle({
        method: 'GET',
        url: new URL(
          'http://localhost/callback?' +
            new URLSearchParams({ code: mockCode, state: mockStateString }).toString()
        ),
        stream: new ReadableStream(),
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
      expect(response.headers.get('set-cookie')).toEqual(
        `${config.accessToken.cookie.name}=${mockAccessToken}, ${config.refreshToken.cookie.name}=${mockRefreshToken}`
      );
      expect(await responseBodyToJson(response.body)).toEqual(
        `Redirecting to ${mockState.redirect}`
      );
    });
  });
});
