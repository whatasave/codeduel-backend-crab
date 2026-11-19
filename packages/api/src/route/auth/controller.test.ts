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
  } as Config;

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
    let spyRotateRefreshToken: Mock<AuthService['rotateRefreshToken']>;
    let spyUserById: ReturnType<typeof spyOn>;
    let spyAccessToken: ReturnType<typeof spyOn>;
    let spyRefreshToken: Mock<AuthService['refreshToken']>;
    let spyByUserId: ReturnType<typeof spyOn>;

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

    test('should refresh access and refresh token', async () => {
      const response = await router.handle(
        new Request('http://localhost/refresh', {
          method: 'POST',
          headers: new Headers(mockHeaders),
        })
      );

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

      expect(spyAccessToken).toHaveBeenCalledWith(
        mockUser,
        [],
        expect.any(Number),
        expect.any(Object)
      );
      expect(spyAccessToken).toHaveBeenCalledTimes(1);

      expect(spyRefreshToken).toHaveBeenCalledWith(
        mockUser,
        expect.any(String),
        expect.any(Number),
        expect.any(Object)
      );
      expect(spyRefreshToken).toHaveBeenCalledTimes(1);

      const newJti = spyRotateRefreshToken.mock.calls[0]?.[1];
      expect(spyRefreshToken.mock.calls[0]?.[1]).toBe(newJti);
      expect(newJti).not.toBe(mockJwtRefreshToken.jti);

      expect(spyByUserId).toHaveBeenCalledWith(mockUser.id, expect.any(Object));
      expect(spyByUserId).toHaveBeenCalledTimes(1);

      expect(response.status).toEqual(204);
      expect(response.headers.get('set-cookie')).toEqual(
        `${config.accessToken.cookie.name}=${mockAccessToken}, ${config.refreshToken.cookie.name}=${mockRefreshToken}`
      );
    });

    test('should revoke the session and logout when the refresh token is reused', async () => {
      spyRotateRefreshToken.mockResolvedValue({
        status: 'reused',
        sessionId: mockAuthSession.id,
        userId: mockUser.id,
      });

      const response = await router.handle(
        new Request('http://localhost/refresh', {
          method: 'POST',
          headers: new Headers(mockHeaders),
        })
      );

      expect(spyRotateRefreshToken).toHaveBeenCalledTimes(1);
      expect(spyUserById).not.toHaveBeenCalled();
      expect(spyAccessToken).not.toHaveBeenCalled();
      expect(spyRefreshToken).not.toHaveBeenCalled();

      expect(response.status).toEqual(204);
      expect(response.headers.get('set-cookie')).toEqual(
        `${config.accessToken.cookie.name}=; Max-Age=-1, ${config.refreshToken.cookie.name}=; Max-Age=-1`
      );
    });

    test('should logout when the refresh token has no session', async () => {
      spyRotateRefreshToken.mockResolvedValue({ status: 'invalid' });

      const response = await router.handle(
        new Request('http://localhost/refresh', {
          method: 'POST',
          headers: new Headers(mockHeaders),
        })
      );

      expect(spyRotateRefreshToken).toHaveBeenCalledTimes(1);
      expect(spyAccessToken).not.toHaveBeenCalled();
      expect(spyRefreshToken).not.toHaveBeenCalled();

      expect(response.status).toEqual(204);
      expect(response.headers.get('set-cookie')).toEqual(
        `${config.accessToken.cookie.name}=; Max-Age=-1, ${config.refreshToken.cookie.name}=; Max-Age=-1`
      );
    });

    test('should logout user due to a failed refresh token', async () => {
      const response = await router.handle(
        new Request('http://localhost/refresh', {
          method: 'POST',
          headers: new Headers({}),
        })
      );

      expect(response.status).toEqual(204);

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
      const response = await router.handle(
        new Request('http://localhost/logout', {
          method: 'POST',
          headers: new Headers(mockHeaders),
        })
      );

      expect(response.status).toEqual(204);
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

      const response = await router.handle(
        new Request('http://localhost/logout', {
          method: 'POST',
          headers: new Headers(mockHeaders),
        })
      );

      expect(spyVerifyRefreshToken).toHaveBeenCalledWith(mockRefreshToken, expect.any(Object));
      expect(spyVerifyRefreshToken).toHaveBeenCalledTimes(1);

      expect(spyDeleteSessionTokenId).toHaveBeenCalledWith(
        mockJwtRefreshToken.jti,
        expect.any(Object)
      );
      expect(spyDeleteSessionTokenId).toHaveBeenCalledTimes(1);

      expect(response.status).toEqual(204);

      expect(response.headers.get('set-cookie')).toEqual(
        `${config.accessToken.cookie.name}=; Max-Age=-1, ${config.refreshToken.cookie.name}=; Max-Age=-1`
      );
    });
  });
});
