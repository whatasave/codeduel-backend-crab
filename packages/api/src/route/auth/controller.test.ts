import { afterEach, beforeAll, beforeEach, describe, expect, jest, spyOn, test } from 'bun:test';
import { AuthService } from './service';
import { UserService } from '../user/service';
import { AuthController } from './controller';
import type { AuthRepository } from './repository';
import type { UserRepository } from '../user/repository';
import type { Config } from './config';
import type { CookieOptions } from '../../utils/cookie';
import type { AuthSession, JwtRefreshToken } from './data';
import type { User } from '../user/data';
import { Router } from '@glass-cannon/router';
import { typebox } from '@glass-cannon/typebox';
import { ReadableStream } from 'node:stream/web';
import { PermissionService } from '../permission/service';
import type { PermissionRepository } from '../permission/repository';

describe('Route.Auth.Controller', () => {
  let service: AuthService;
  let userService: UserService;
  let permissionService: PermissionService;
  let controller: AuthController;
  let router: Router;
  const config = {
    accessToken: {
      cookie: { name: 'access-token' } as CookieOptions,
    },
    refreshToken: {
      cookie: { name: 'refresh-token' } as CookieOptions,
    },
  } as Config;

  beforeAll(() => {
    const repository = {} as AuthRepository;
    const userRepository = {} as UserRepository;
    const permissionRepository = {} as PermissionRepository;
    userService = new UserService(userRepository);
    permissionService = new PermissionService(permissionRepository);
    service = new AuthService(repository, permissionService, config);
    controller = new AuthController(service, userService, permissionService, config);
    router = new Router();
    controller.setup(typebox(router));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should verify token', async () => {
    const response = await router.handle({
      method: 'GET',
      url: new URL('http://localhost/validate'),
      stream: new ReadableStream(),
      headers: new Headers(),
    });

    // TODO implement

    // expect(response.status).toEqual(500);
    // expect(await responseBodyToJson(response.body)).toEqual({ error: 'Path not implemented' });
  });

  describe('POST /refresh', () => {
    const mockDate = new Date('2023-10-01T12:00:00Z').toISOString();
    const mockAccessToken = 'access-token';
    const mockRefreshToken = 'refresh-token';
    const mockHeaders = {
      cookie: `${config.accessToken.cookie.name}=${mockAccessToken}; ${config.refreshToken.cookie.name}=${mockRefreshToken}`,
    };
    const mockJti1 = 'jti1';
    const mockUser: User = {
      id: 1,
      username: 'username',
      createdAt: mockDate,
      updatedAt: mockDate,
    };
    const mockAuthSession: AuthSession = {
      id: 1,
      userId: mockUser.id,
      tokenId: mockJti1,
      provider: 'github',
      createdAt: mockDate,
      updatedAt: mockDate,
    };
    const mockJwtRefreshToken: JwtRefreshToken = {
      iss: 'codeduel.it',
      aud: 'codeduel.it',
      exp: 1234567890,
      jti: mockJti1,
      sub: mockUser.id,
    };

    let spyVerifyRefreshToken: ReturnType<typeof spyOn>;
    let spySessionByTokenId: ReturnType<typeof spyOn>;
    let spyUserById: ReturnType<typeof spyOn>;
    let spyAccessToken: ReturnType<typeof spyOn>;
    let spyRefreshToken: ReturnType<typeof spyOn>;
    let spyUpdateSession: ReturnType<typeof spyOn>;

    beforeEach(() => {
      spyVerifyRefreshToken = spyOn(service, 'verifyRefreshToken').mockResolvedValue(
        mockJwtRefreshToken
      );
      spySessionByTokenId = spyOn(service, 'sessionByTokenId').mockResolvedValue(mockAuthSession);
      spyUserById = spyOn(userService, 'byId').mockResolvedValue(mockUser);
      spyAccessToken = spyOn(service, 'accessToken').mockResolvedValue(mockAccessToken);
      spyRefreshToken = spyOn(service, 'refreshToken').mockResolvedValue(mockRefreshToken);
      spyUpdateSession = spyOn(service, 'updateSession').mockResolvedValue();
    });

    test('should refresh access and refresh token', async () => {
      const response = await router.handle({
        method: 'POST',
        url: new URL('http://localhost/refresh'),
        stream: new ReadableStream(),
        headers: new Headers(mockHeaders),
      });

      expect(spyVerifyRefreshToken).toHaveBeenCalledWith(mockRefreshToken);
      expect(spyVerifyRefreshToken).toHaveBeenCalledTimes(1);

      expect(spySessionByTokenId).toHaveBeenCalledWith(mockJwtRefreshToken.jti);
      expect(spySessionByTokenId).toHaveBeenCalledTimes(1);

      expect(spyUserById).toHaveBeenCalledWith(mockJwtRefreshToken.sub);
      expect(spyUserById).toHaveBeenCalledTimes(1);

      expect(spyAccessToken).toHaveBeenCalledWith(mockUser);
      expect(spyAccessToken).toHaveBeenCalledTimes(1);

      expect(spyRefreshToken).toHaveBeenCalledWith(mockUser, expect.any(String));
      expect(spyRefreshToken).toHaveBeenCalledTimes(1);

      expect(spyUpdateSession).toHaveBeenCalledWith(mockAuthSession.id, expect.any(String));
      expect(spyUpdateSession).toHaveBeenCalledTimes(1);

      expect(response.status).toEqual(204);
      if (!response.headers) throw new Error('Response headers are undefined');
      expect(response.headers.get('set-cookie')).toEqual(
        `${config.accessToken.cookie.name}=${mockAccessToken}, ${config.refreshToken.cookie.name}=${mockRefreshToken}`
      );
    });

    test('should logout user due to a failed refresh token', async () => {
      const response = await router.handle({
        method: 'POST',
        url: new URL('http://localhost/refresh'),
        stream: new ReadableStream(),
        headers: new Headers({}),
      });

      expect(response.status).toEqual(204);
      if (!response.headers) throw new Error('Response headers are undefined');

      expect(response.headers.get('set-cookie')).toEqual(
        `${config.accessToken.cookie.name}=; Max-Age=-1, ${config.refreshToken.cookie.name}=; Max-Age=-1`
      );
    });
  });

  describe('POST /logout', () => {
    const mockJwtRefreshToken: JwtRefreshToken = {
      iss: 'codeduel.it',
      aud: 'codeduel.it',
      exp: 1234567890,
      jti: 'refresh-token-id',
      sub: 1,
    };

    let spyVerifyRefreshToken: ReturnType<typeof spyOn>;
    let spyDeleteSessionTokenId: ReturnType<typeof spyOn>;

    beforeEach(() => {
      spyVerifyRefreshToken = spyOn(service, 'verifyRefreshToken').mockResolvedValue(
        mockJwtRefreshToken
      );
      spyDeleteSessionTokenId = spyOn(service, 'deleteSessionTokenId').mockResolvedValue();
    });

    test('should log the user out', async () => {
      const mockAccessToken = 'access-token';
      const mockRefreshToken = 'refresh-token';
      const mockHeaders = {
        cookie: `${config.accessToken.cookie.name}=${mockAccessToken}; ${config.refreshToken.cookie.name}=${mockRefreshToken}`,
      };
      const response = await router.handle({
        method: 'POST',
        url: new URL('http://localhost/logout'),
        stream: new ReadableStream(),
        headers: new Headers(mockHeaders),
      });

      expect(response.status).toEqual(204);
      if (!response.headers) throw new Error('Response headers are undefined');
      expect(response.headers.get('set-cookie')).toEqual(
        `${config.accessToken.cookie.name}=; Max-Age=-1, ${config.refreshToken.cookie.name}=; Max-Age=-1`
      );
    });

    test('should remove the refresh token from session', async () => {
      const mockAccessToken = 'access-token';
      const mockRefreshToken = 'refresh-token';
      const mockHeaders = {
        cookie: `${config.accessToken.cookie.name}=${mockAccessToken}; ${config.refreshToken.cookie.name}=${mockRefreshToken}`,
      };

      const response = await router.handle({
        method: 'POST',
        url: new URL('http://localhost/logout'),
        stream: new ReadableStream(),
        headers: new Headers(mockHeaders),
      });

      expect(spyVerifyRefreshToken).toHaveBeenCalledWith(mockRefreshToken);
      expect(spyVerifyRefreshToken).toHaveBeenCalledTimes(1);

      expect(spyDeleteSessionTokenId).toHaveBeenCalledWith(mockJwtRefreshToken.jti);
      expect(spyDeleteSessionTokenId).toHaveBeenCalledTimes(1);

      expect(response.status).toEqual(204);
      if (!response.headers) throw new Error('Response headers are undefined');

      expect(response.headers.get('set-cookie')).toEqual(
        `${config.accessToken.cookie.name}=; Max-Age=-1, ${config.refreshToken.cookie.name}=; Max-Age=-1`
      );
    });
  });
});
