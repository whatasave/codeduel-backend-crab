import { afterEach, beforeAll, beforeEach, describe, expect, jest, spyOn, test } from 'bun:test';

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
    let spySessionByTokenId: ReturnType<typeof spyOn>;
    let spyUserById: ReturnType<typeof spyOn>;
    let spyAccessToken: ReturnType<typeof spyOn>;
    let spyRefreshToken: ReturnType<typeof spyOn>;
    let spyUpdateSession: ReturnType<typeof spyOn>;
    let spyByUserId: ReturnType<typeof spyOn>;

    beforeEach(() => {
      spyVerifyRefreshToken = spyOn(service, 'verifyRefreshToken').mockResolvedValue(
        mockJwtRefreshToken
      );
      spySessionByTokenId = spyOn(service, 'sessionByTokenId').mockResolvedValue(mockAuthSession);
      spyUserById = spyOn(userService, 'byId').mockResolvedValue(mockUser);
      spyAccessToken = spyOn(service, 'accessToken').mockResolvedValue(mockAccessToken);
      spyRefreshToken = spyOn(service, 'refreshToken').mockResolvedValue(mockRefreshToken);
      spyUpdateSession = spyOn(service, 'updateSession').mockResolvedValue();
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

      expect(spySessionByTokenId).toHaveBeenCalledWith(mockJwtRefreshToken.jti);
      expect(spySessionByTokenId).toHaveBeenCalledTimes(1);

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

      expect(spyUpdateSession).toHaveBeenCalledWith(
        mockAuthSession.id,
        expect.any(String),
        expect.any(Object)
      );
      expect(spyUpdateSession).toHaveBeenCalledTimes(1);

      expect(spyByUserId).toHaveBeenCalledWith(mockUser.id, expect.any(Object));
      expect(spyByUserId).toHaveBeenCalledTimes(1);

      expect(response.status).toEqual(204);
      expect(response.headers.get('set-cookie')).toEqual(
        `${config.accessToken.cookie.name}=${mockAccessToken}, ${config.refreshToken.cookie.name}=${mockRefreshToken}`
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
