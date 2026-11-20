import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  spyOn,
  test,
  type Mock,
} from 'bun:test';

import { Logger } from '@codeduel-backend-crab/logger';
import { Router } from '@glass-cannon/router';

import type { PermissionRepository } from '@/route/permission/repository';
import { PermissionService } from '@/route/permission/service';
import type { User } from '@/route/user/data';
import type { UserRepository } from '@/route/user/repository';
import { UserService } from '@/route/user/service';

import type { Config } from './config';
import { AuthController } from './controller';
import type { AuthSession, JwtRefreshToken } from './data';
import type { AuthRepository } from './repository';
import { AuthService } from './service';

describe('Route.Auth.Controller', () => {
  let service: AuthService;
  let userService: UserService;
  let permissionService: PermissionService;
  let controller: AuthController;
  let router: Router;
  const config = {
    accessToken: {
      cookie: { name: 'access-token' },
    },
    refreshToken: {
      cookie: { name: 'refresh-token' },
    },
    csrfToken: {
      secret: 'csrf-secret',
      headerName: 'X-CSRF-Token',
      cookie: { name: 'csrf-token' },
    },
  } as Config;
  const clearedCookies = [
    `${config.accessToken.cookie.name}=; Max-Age=-1`,
    `${config.refreshToken.cookie.name}=; Max-Age=-1`,
    `${config.csrfToken.cookie.name}=; Max-Age=-1`,
  ].join(', ');
  const invalidCsrfBody = { error: 'Invalid or missing CSRF token', code: 'INVALID_CSRF_TOKEN' };
  const mockAccessToken = 'access-token';
  const mockRefreshToken = 'refresh-token';
  const mockJti = 'jti1';

  function authRequest(
    path: string,
    options: { refreshToken?: string; csrfCookie?: string; csrfHeader?: string } = {}
  ): Request {
    const cookies = [`${config.accessToken.cookie.name}=${mockAccessToken}`];
    if (options.refreshToken !== undefined) {
      cookies.push(`${config.refreshToken.cookie.name}=${options.refreshToken}`);
    }
    if (options.csrfCookie !== undefined) {
      cookies.push(`${config.csrfToken.cookie.name}=${options.csrfCookie}`);
    }
    const headers = new Headers({ cookie: cookies.join('; ') });
    if (options.csrfHeader !== undefined) {
      headers.set(config.csrfToken.headerName, options.csrfHeader);
    }
    return new Request(`http://localhost${path}`, { method: 'POST', headers });
  }

  function validRequest(path: string): Request {
    const csrfToken = service.csrfToken(mockJti);
    return authRequest(path, {
      refreshToken: mockRefreshToken,
      csrfCookie: csrfToken,
      csrfHeader: csrfToken,
    });
  }

  beforeAll(() => {
    const repository = {} as AuthRepository;
    const userRepository = {} as UserRepository;
    const permissionRepository = {} as PermissionRepository;
    const logger = Logger.create({ level: 'silent', serviceName: 'test' });
    userService = new UserService(userRepository);
    permissionService = new PermissionService(permissionRepository);
    service = new AuthService(repository, permissionService, config);
    controller = new AuthController(service, userService, permissionService, logger, config);
    router = Router.from(controller.setup());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should verify token', async () => {
    // const response = await router.handle({
    //   method: 'GET',
    //   url: new URL('http://localhost/validate'),
    //   stream: new ReadableStream(),
    //   headers: new Headers(),
    // });
    //
    // expect(response.status).toEqual(500);
    // expect(await responseBodyToJson(response.body)).toEqual({ error: 'Path not implemented' });
  });

  describe('POST /refresh', () => {
    const mockDate = new Date('2023-10-01T12:00:00Z').toISOString();
    const mockUser: User = {
      id: 1,
      username: 'username',
      createdAt: mockDate,
      updatedAt: mockDate,
    };
    const mockAuthSession: AuthSession = {
      id: 1,
      userId: mockUser.id,
      tokenId: mockJti,
      provider: 'github',
      createdAt: mockDate,
      updatedAt: mockDate,
    };
    const mockJwtRefreshToken: JwtRefreshToken = {
      iss: 'codeduel.it',
      aud: 'codeduel.it',
      exp: 1234567890,
      jti: mockJti,
      sub: mockUser.id,
    };

    let spyVerifyRefreshToken: Mock<AuthService['verifyRefreshToken']>;
    let spyRotateRefreshToken: Mock<AuthService['rotateRefreshToken']>;
    let spyUserById: Mock<UserService['byId']>;
    let spyAccessToken: Mock<AuthService['accessToken']>;
    let spyRefreshToken: Mock<AuthService['refreshToken']>;
    let spyByUserId: Mock<PermissionService['byUserId']>;

    beforeEach(() => {
      spyVerifyRefreshToken = spyOn(service, 'verifyRefreshToken').mockResolvedValue(
        mockJwtRefreshToken
      );
      spyRotateRefreshToken = spyOn(service, 'rotateRefreshToken').mockResolvedValue({
        status: 'rotated',
        session: mockAuthSession,
      });
      spyUserById = spyOn(userService, 'byId').mockResolvedValue(mockUser);
      spyAccessToken = spyOn(service, 'accessToken').mockResolvedValue(mockAccessToken);
      spyRefreshToken = spyOn(service, 'refreshToken').mockResolvedValue(mockRefreshToken);
      spyByUserId = spyOn(permissionService, 'byUserId').mockResolvedValue([]);
    });

    test('should refresh access, refresh and csrf token', async () => {
      const response = await router.handle(validRequest('/refresh'));

      expect(spyVerifyRefreshToken).toHaveBeenCalledWith(mockRefreshToken, expect.any(Object));
      expect(spyVerifyRefreshToken).toHaveBeenCalledTimes(1);

      expect(spyRotateRefreshToken).toHaveBeenCalledWith(
        mockJwtRefreshToken,
        expect.any(String),
        expect.any(Number),
        expect.any(Object)
      );
      expect(spyRotateRefreshToken).toHaveBeenCalledTimes(1);

      expect(spyUserById).toHaveBeenCalledWith(mockJwtRefreshToken.sub, expect.any(Object));
      expect(spyUserById).toHaveBeenCalledTimes(1);

      expect(spyByUserId).toHaveBeenCalledWith(mockUser.id, expect.any(Object));
      expect(spyByUserId).toHaveBeenCalledTimes(1);

      const newJti = spyRotateRefreshToken.mock.calls[0]?.[1] ?? '';
      expect(newJti).not.toEqual(mockJti);

      expect(spyAccessToken).toHaveBeenCalledWith(
        mockUser,
        [],
        newJti,
        expect.any(Number),
        expect.any(Object)
      );
      expect(spyAccessToken).toHaveBeenCalledTimes(1);
      expect(spyRefreshToken).toHaveBeenCalledWith(
        mockUser,
        newJti,
        expect.any(Number),
        expect.any(Object)
      );
      expect(spyRefreshToken).toHaveBeenCalledTimes(1);

      expect(response.status).toEqual(204);
      expect(response.headers.get('set-cookie')).toEqual(
        `${config.accessToken.cookie.name}=${mockAccessToken}, ${config.refreshToken.cookie.name}=${mockRefreshToken}, ${config.csrfToken.cookie.name}=${service.csrfToken(newJti)}`
      );
    });

    test('should revoke the session and logout when the refresh token is reused', async () => {
      spyRotateRefreshToken.mockResolvedValue({
        status: 'reused',
        sessionId: mockAuthSession.id,
        userId: mockUser.id,
      });

      const response = await router.handle(validRequest('/refresh'));

      expect(spyRotateRefreshToken).toHaveBeenCalledTimes(1);
      expect(response.status).toEqual(204);
      expect(response.headers.get('set-cookie')).toEqual(clearedCookies);
    });

    test('should logout when the refresh token has no session', async () => {
      spyRotateRefreshToken.mockResolvedValue({ status: 'invalid' });

      const response = await router.handle(validRequest('/refresh'));

      expect(spyRotateRefreshToken).toHaveBeenCalledTimes(1);
      expect(response.status).toEqual(204);
      expect(response.headers.get('set-cookie')).toEqual(clearedCookies);
    });

    test('should reject without csrf header before checking the refresh token', async () => {
      const response = await router.handle(
        authRequest('/refresh', { csrfCookie: service.csrfToken(mockJti) })
      );

      expect(response.status).toEqual(403);
      expect(await response.json()).toEqual(invalidCsrfBody);
      expect(response.headers.get('set-cookie')).toBeNull();
      expect(spyVerifyRefreshToken).not.toHaveBeenCalled();
    });

    test('should reject without csrf header', async () => {
      const response = await router.handle(
        authRequest('/refresh', {
          refreshToken: mockRefreshToken,
          csrfCookie: service.csrfToken(mockJti),
        })
      );

      expect(response.status).toEqual(403);
      expect(response.headers.get('set-cookie')).toBeNull();
      expect(spyVerifyRefreshToken).not.toHaveBeenCalled();
      expect(spyRotateRefreshToken).not.toHaveBeenCalled();
    });

    test('should reject without csrf cookie, leaving cookies untouched', async () => {
      const response = await router.handle(
        authRequest('/refresh', {
          refreshToken: mockRefreshToken,
          csrfHeader: service.csrfToken(mockJti),
        })
      );

      expect(response.status).toEqual(403);
      expect(await response.json()).toEqual(invalidCsrfBody);
      expect(response.headers.get('set-cookie')).toBeNull();
      expect(spyVerifyRefreshToken).not.toHaveBeenCalled();
      expect(spyRotateRefreshToken).not.toHaveBeenCalled();
    });

    test('should reject when csrf header and cookie do not match', async () => {
      const response = await router.handle(
        authRequest('/refresh', {
          refreshToken: mockRefreshToken,
          csrfCookie: service.csrfToken(mockJti),
          csrfHeader: 'other-token',
        })
      );

      expect(response.status).toEqual(403);
      expect(spyVerifyRefreshToken).not.toHaveBeenCalled();
    });

    test('should reject a csrf token bound to another session', async () => {
      const foreignToken = service.csrfToken('another-session');
      const response = await router.handle(
        authRequest('/refresh', {
          refreshToken: mockRefreshToken,
          csrfCookie: foreignToken,
          csrfHeader: foreignToken,
        })
      );

      expect(response.status).toEqual(403);
      expect(response.headers.get('set-cookie')).toBeNull();
      expect(spyVerifyRefreshToken).toHaveBeenCalledTimes(1);
      expect(spyRotateRefreshToken).not.toHaveBeenCalled();
    });

    test('should logout user due to a missing refresh token', async () => {
      const csrfToken = service.csrfToken(mockJti);
      const response = await router.handle(
        authRequest('/refresh', { csrfCookie: csrfToken, csrfHeader: csrfToken })
      );

      expect(spyVerifyRefreshToken).not.toHaveBeenCalled();
      expect(response.status).toEqual(204);
      expect(response.headers.get('set-cookie')).toEqual(clearedCookies);
    });

    test('should logout user due to an invalid refresh token', async () => {
      spyOn(service, 'verifyRefreshToken').mockRejectedValue(new Error('invalid signature'));

      const response = await router.handle(validRequest('/refresh'));

      expect(spyRotateRefreshToken).not.toHaveBeenCalled();
      expect(spyAccessToken).not.toHaveBeenCalled();

      expect(response.status).toEqual(204);
      expect(response.headers.get('set-cookie')).toEqual(clearedCookies);
    });

    test('should allow retrying the same token if signing fails', async () => {
      spyRefreshToken.mockRejectedValueOnce(new Error('signing failed'));

      const result = await Promise.resolve(router.handle(validRequest('/refresh'))).catch(
        (error: unknown) => error
      );
      expect(result).toEqual(new Error('signing failed'));
      expect(spyRotateRefreshToken).not.toHaveBeenCalled();

      const response = await router.handle(validRequest('/refresh'));
      expect(spyRotateRefreshToken).toHaveBeenCalledTimes(1);
      const newJti = spyRotateRefreshToken.mock.calls[0]?.[1] ?? '';
      expect(response.status).toEqual(204);
      expect(response.headers.get('set-cookie')).toEqual(
        `${config.accessToken.cookie.name}=${mockAccessToken}, ${config.refreshToken.cookie.name}=${mockRefreshToken}, ${config.csrfToken.cookie.name}=${service.csrfToken(newJti)}`
      );
    });
  });

  describe('POST /logout', () => {
    const mockJwtRefreshToken: JwtRefreshToken = {
      iss: 'codeduel.it',
      aud: 'codeduel.it',
      exp: 1234567890,
      jti: mockJti,
      sub: 1,
    };

    let spyVerifyRefreshToken: Mock<AuthService['verifyRefreshToken']>;
    let spyDeleteSessionTokenId: Mock<AuthService['deleteSessionTokenId']>;

    beforeEach(() => {
      spyVerifyRefreshToken = spyOn(service, 'verifyRefreshToken').mockResolvedValue(
        mockJwtRefreshToken
      );
      spyDeleteSessionTokenId = spyOn(service, 'deleteSessionTokenId').mockResolvedValue();
    });

    test('should log the user out and remove the session', async () => {
      const response = await router.handle(validRequest('/logout'));

      expect(spyVerifyRefreshToken).toHaveBeenCalledWith(mockRefreshToken, expect.any(Object));
      expect(spyVerifyRefreshToken).toHaveBeenCalledTimes(1);

      expect(spyDeleteSessionTokenId).toHaveBeenCalledWith(
        mockJwtRefreshToken.jti,
        expect.any(Object)
      );
      expect(spyDeleteSessionTokenId).toHaveBeenCalledTimes(1);

      expect(response.status).toEqual(204);
      expect(response.headers.get('set-cookie')).toEqual(clearedCookies);
    });

    test('should clear cookies when the refresh token is invalid', async () => {
      spyOn(service, 'verifyRefreshToken').mockRejectedValue(new Error('jwt expired'));

      const response = await router.handle(validRequest('/logout'));

      expect(spyDeleteSessionTokenId).not.toHaveBeenCalled();
      expect(response.status).toEqual(204);
      expect(response.headers.get('set-cookie')).toEqual(clearedCookies);
    });

    test('should reject without csrf cookie, leaving cookies and session untouched', async () => {
      const response = await router.handle(
        authRequest('/logout', { refreshToken: mockRefreshToken })
      );

      expect(response.status).toEqual(403);
      expect(await response.json()).toEqual(invalidCsrfBody);
      expect(response.headers.get('set-cookie')).toBeNull();
      expect(spyVerifyRefreshToken).not.toHaveBeenCalled();
      expect(spyDeleteSessionTokenId).not.toHaveBeenCalled();
    });

    test('should reject a cross-site logout without csrf header', async () => {
      const response = await router.handle(
        authRequest('/logout', {
          refreshToken: mockRefreshToken,
          csrfCookie: service.csrfToken(mockJti),
        })
      );

      expect(response.status).toEqual(403);
      expect(await response.json()).toEqual(invalidCsrfBody);
      expect(response.headers.get('set-cookie')).toBeNull();
      expect(spyVerifyRefreshToken).not.toHaveBeenCalled();
      expect(spyDeleteSessionTokenId).not.toHaveBeenCalled();
    });

    test('should reject a csrf token bound to another session', async () => {
      const foreignToken = service.csrfToken('another-session');
      const response = await router.handle(
        authRequest('/logout', {
          refreshToken: mockRefreshToken,
          csrfCookie: foreignToken,
          csrfHeader: foreignToken,
        })
      );

      expect(response.status).toEqual(403);
      expect(response.headers.get('set-cookie')).toBeNull();
      expect(spyDeleteSessionTokenId).not.toHaveBeenCalled();
    });
  });
});
