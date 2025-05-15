import { afterEach, beforeAll, beforeEach, describe, expect, jest, spyOn, test } from 'bun:test';
import { AuthService } from './service';
import { UserService } from '../user/service';
import { AuthController } from './controller';
import type { AuthRepository } from './repository';
import type { UserRepository } from '../user/repository';
import type { Config } from './config';
import type { CookieOptions } from '../../utils/cookie';
import type { JwtRefreshToken } from './data';
import { Router, type PathString } from '@codeduel-backend-crab/server';

describe('Route.Auth.Controller', () => {
  let service: AuthService;
  let userService: UserService;
  let controller: AuthController;
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
    service = new AuthService(repository, config);
    userService = new UserService(userRepository);
    controller = new AuthController(service, userService, config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should set up routes', async () => {
    const router = new Router();
    controller.setup(router.group({ prefix: '/' }));
    const routes = [...router.allRoutes()].map((r) => r.path);
    const filteredRoutes = routes.filter(
      (r) => r && !r.includes('/github') && !r.includes('/gitlab')
    );
    const expectedRoutes = ['/validate', '/refresh', '/logout'].sort() as PathString[];
    expect(filteredRoutes).toHaveLength(expectedRoutes.length);
    expect(filteredRoutes.sort()).toEqual(expectedRoutes);
  });

  test('should refresh access and refresh token', async () => {});

  describe('GET /logout', () => {
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
      const response = await controller.logout.handler({
        method: 'GET',
        path: '/logout',
        query: {},
        params: {},
        body: undefined,
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

      const response = await controller.logout.handler({
        method: 'GET',
        path: '/logout',
        query: {},
        params: {},
        body: undefined,
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
