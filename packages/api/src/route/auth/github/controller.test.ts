import { afterEach, beforeAll, describe, expect, spyOn, test, jest } from 'bun:test';
import { GithubService } from './service';
import { AuthService } from '../service';
import type { AuthRepository } from '../repository';
import type { CookieOptions } from '../../../utils/cookie';
import type { Config as GithubConfig } from './config';
import type { Config as AuthConfig } from '../config';
import type { Auth, CreateAuthSession } from '../data';
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

  test('should redirect to github login page', async () => {
    const redirectUrl = 'fe.codeduel.it';
    const state = 'state';
    const stateCookie = `${config.github.stateCookie.name}=${state}`;
    const authorizationUrl = 'github-login-url';
    const mockHeader = {
      'user-agent': 'codeduel.it/1.0',
      'x-forwarded-for': '9.11.69.420',
    };

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
    // expect(response.headers).toMatchObject({
    //   'content-type': 'text/plain',
    //   'set-cookie': [stateCookie],
    //   'location': authorizationUrl,
    // });
    expect(response.headers.get('location')).toEqual(authorizationUrl);
    expect(response.headers.get('content-type')).toEqual('text/plain');
    expect(response.headers.get('set-cookie')).toEqual(stateCookie);
    expect(response.body).toEqual(`Redirecting to ${authorizationUrl}`);
  });

  test('should set the refresh and access token', async () => {
    const mockCode = 'code';
    const mockState = 'state';
    const mockResponse = {
      access_token: 'access-token',
      token_type: 'bearer',
      scope: 'read:user,user:email',
    } as unknown as GithubAccessToken;
    const mockUser = {
      id: 0,
      username: 'username',
      updatedAt: '2023-10-01T00:00:00.000Z',
      createdAt: '2023-10-01T00:00:00.000Z',
    } as User;
    const mockAuth = {
      userId: mockUser.id,
      provider: 'github',
      createdAt: '2023-10-01T00:00:00.000Z',
      updatedAt: '2023-10-01T00:00:00.000Z',
    } as Auth;

    const cookies = {
      [config.github.stateCookie.name]: mockState,
    };
    const mockHeader = {
      cookie: `${config.github.stateCookie.name}=${mockState}`,
      'user-agent': 'codeduel.it/1.0',
      'x-forwarded-for': '9.11.69.420',
    };
    const mockSession = {
      userId: mockUser.id,
      jti: 'jti',
      ip: mockHeader['x-forwarded-for'],
      userAgent: mockHeader['user-agent'],
    } as CreateAuthSession;

    const spyExchangeCodeForToken = spyOn(service, 'exchangeCodeForToken').mockResolvedValue(
      mockResponse
    );
    const spyUserData = spyOn(service, 'userData').mockResolvedValue({
      id: mockUser.id,
      login: mockUser.username,
      name: mockUser.username,
      avatar_url: 'avatar_url',
    } as GithubUserData);
    const spyCreate = spyOn(service, 'create').mockResolvedValue([mockAuth, mockUser]);
    const spyAccessToken = spyOn(authService, 'accessToken').mockResolvedValue('access-token');
    const spyRefreshToken = spyOn(authService, 'refreshToken').mockResolvedValue('refresh-token');
    const spyCreateSession = spyOn(authService, 'createSession').mockResolvedValue(mockSession);
    const spyDecodeState = spyOn(authService, 'decodeState').mockReturnValue({
      redirect: 'redirect',
      ip: mockHeader['x-forwarded-for'],
      userAgent: mockHeader['user-agent'],
      csrfToken: 'csrf-token',
    });
    // const spyParseCookies = spyOn(globalThis, 'parseCookies').mockReturnValue(cookies);
    // const spyBadRequest = spyOn(globalThis, 'badRequest').mockReturnValue({
    //   status: 400,
    //   body: { message: 'Invalid or missing state' },
    //   headers: undefined,
    // } as Response);

    const response = await controller.callback.handler({
      method: 'GET',
      path: '/callback',
      query: { code: mockCode, state: mockState },
      params: {},
      body: undefined,
      headers: new Headers(mockHeader),
    });
    // expect(spyParseCookies).toHaveBeenCalledWith(mockHeader.cookie);
    // expect(spyParseCookies).toHaveBeenCalledTimes(1);
    expect(spyDecodeState).toHaveBeenCalledWith(mockState);
    expect(spyDecodeState).toHaveBeenCalledTimes(1);
    expect(spyExchangeCodeForToken).toHaveBeenCalledWith(mockCode, mockState);
    expect(spyExchangeCodeForToken).toHaveBeenCalledTimes(1);
    expect(spyUserData).toHaveBeenCalledWith(mockResponse.access_token);
    expect(spyUserData).toHaveBeenCalledTimes(1);
    expect(spyCreate).toHaveBeenCalledWith({
      name: 'github',
      id: mockUser.id,
      login: mockUser.username,
      avatar_url: 'avatar_url',
    });
    expect(spyCreate).toHaveBeenCalledTimes(1);
    expect(spyAccessToken).toHaveBeenCalledWith(mockUser);
    expect(spyAccessToken).toHaveBeenCalledTimes(1);
    expect(spyRefreshToken).toHaveBeenCalledWith(mockUser, mockSession.jti);
    expect(spyRefreshToken).toHaveBeenCalledTimes(1);
    expect(spyCreateSession).toHaveBeenCalledWith(
      mockUser.id,
      mockSession.jti,
      mockHeader['x-forwarded-for'],
      mockHeader['user-agent']
    );
    expect(spyCreateSession).toHaveBeenCalledTimes(1);
    expect(response.status).toEqual(307);
    if (!response.headers) throw new Error('Response headers are undefined');
    expect(response.headers.get('location')).toEqual('redirect');
    expect(response.headers.get('set-cookie')).toEqual([
      `access-token=access-token;`,
      `refresh-token=refresh-token;`,
    ]);
  });
});
