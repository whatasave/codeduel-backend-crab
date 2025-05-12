import { afterEach, beforeAll, describe, expect, spyOn, test, jest, mock } from 'bun:test';
import { GithubService } from './service';
import { AuthService } from '../service';
import type { AuthRepository } from '../repository';
import type { CookieOptions } from '../../../utils/cookie';
import type { Config as GithubConfig } from './config';
import type { Config as AuthConfig } from '../config';
import type { Auth, CreateAuthSession, State } from '../data';
import type { User } from '../../user/data';
import type { GithubAccessToken, GithubUserData } from './data';

describe('Route.User.Services', () => {
  let authService: AuthService;
  let service: GithubService;
  const config = {
    github: {
      clientId: 'github-client-id',
      clientSecret: 'github-client-secret',
      redirectUri: 'github-redirect-uri',
      stateCookie: { name: 'github-state-cookie' } as CookieOptions,
    } as GithubConfig,
  } as AuthConfig;
  const mockUser = {
    id: 1,
    username: 'username',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as User;
  const mockAuth = {
    userId: mockUser.id,
    provider: 'github',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Auth;
  const mockGithubUserData = {
    id: 1,
    login: 'username',
  } as GithubUserData;
  const mockAccessToken = {
    access_token: 'github-access-token',
    token_type: 'Bearer',
    scope: 'repo',
  } as GithubAccessToken;
  const mockState = {
    csrfToken: 'csrf-token',
    redirect: 'http://localhost:3000',
    ip: '::1',
  } as State;
  const mockStateString = JSON.stringify({
    csrfToken: mockState.csrfToken,
    redirect: mockState.redirect,
    ip: mockState.ip,
  });
  const mockRefreshToken = 'refresh-token';
  const mockUserAgent = 'codeduel.it/1.0';
  const mockCreateSession = {
    userId: mockUser.id,
    tokenId: mockRefreshToken,
    ip: mockState.ip,
    userAgent: mockUserAgent,
    provider: 'github',
  } satisfies CreateAuthSession;

  beforeAll(() => {
    const authRepository = {} as AuthRepository;
    authService = new AuthService(authRepository, config);
    service = new GithubService(authService, config.github);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('create', async () => {
    const spyCreateForce = spyOn(authService, 'createForce').mockResolvedValue([
      mockAuth,
      mockUser,
    ]);
    const [auth, user] = await service.create(mockGithubUserData);

    expect(spyCreateForce).toHaveBeenCalledWith(
      { name: 'github', userId: mockGithubUserData.id },
      {
        username: mockGithubUserData.login,
        name: mockGithubUserData.login,
        avatar: undefined,
      }
    );
    expect(spyCreateForce).toHaveBeenCalledTimes(1);
    expect(auth).toEqual(mockAuth);
    expect(user).toEqual(mockUser);
  });

  test('exchangeCodeForToken', async () => {
    // const spyExchange = spyOn(authService, 'exchangeCodeForToken').mockResolvedValue(
    //   mockAccessToken
    // );
    // const accessToken = await service.exchangeCodeForToken('code', 'state');
    // expect(spyExchange).toHaveBeenCalledWith('code', 'state');
    // expect(spyExchange).toHaveBeenCalledTimes(1);
    // expect(accessToken).toEqual(mockAccessToken);
  });

  test('userData', async () => {
    // const spyUserData = spyOn(authService, 'userData').mockResolvedValue(mockGithubUserData);
    // const userData = await service.userData(mockAccessToken.access_token);
    // expect(spyUserData).toHaveBeenCalledWith(mockAccessToken.access_token);
    // expect(spyUserData).toHaveBeenCalledTimes(1);
    // expect(userData).toEqual(mockGithubUserData);
  });

  test('authorizationUrl', async () => {
    const authUrl = service.authorizationUrl(mockStateString);

    expect(authUrl).toEqual(
      `https://github.com/login/oauth/authorize?client_id=${config.github.clientId}&redirect_uri=${
        config.github.redirectUri
      }&scope=read%3Auser%2Cuser%3Aemail&state=${encodeURIComponent(
        mockStateString
      )}&allow_signup=false`
    );
  });

  test('createSession', async () => {
    const spyCreateSession = spyOn(authService, 'createSession').mockResolvedValue();
    await service.createSession(mockUser.id, mockRefreshToken, mockState.ip, mockUserAgent);

    expect(spyCreateSession).toHaveBeenCalledWith(mockCreateSession);
    expect(spyCreateSession).toHaveBeenCalledTimes(1);
  });
});
