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
import { Router, routes } from '@glass-cannon/router';
import { json } from '@glass-cannon/server-bun';

import { loggerDecorator } from '@/middleware/logger';
import type { Permission } from '@/route/permission/data';
import type { PermissionRepository } from '@/route/permission/repository';
import { PermissionService } from '@/route/permission/service';

import type { Config } from './config';
import type { SessionUser } from './data';
import { AuthMiddleware } from './middleware';
import type { AuthRepository } from './repository';
import { AuthService } from './service';

describe('Route.Auth.Middleware', () => {
  let service: AuthService;
  let router: Router;
  let spyVerifySession: Mock<AuthService['verifySession']>;

  const config = {
    accessToken: { cookie: { name: 'access-token' } },
    refreshToken: { cookie: { name: 'refresh-token' } },
    csrfToken: {
      secret: 'csrf-secret',
      headerName: 'X-CSRF-Token',
      cookie: { name: 'csrf-token' },
    },
  } as Config;
  const mockDate = new Date('2023-10-01T12:00:00Z').toISOString();
  const writePermission: Permission = {
    id: 1,
    resource: 'challenge',
    name: 'write',
    createdAt: mockDate,
    updatedAt: mockDate,
  };
  const mockSessionUser: SessionUser = {
    id: 1,
    username: 'username',
    permissions: [writePermission],
    sessionId: 'session-1',
  };

  beforeAll(() => {
    const logger = Logger.create({ level: 'silent', serviceName: 'test' });
    service = new AuthService(
      {} as AuthRepository,
      new PermissionService({} as PermissionRepository),
      config
    );
    const auth = new AuthMiddleware(service);
    const ok = (): Response => json({ status: 200, body: { ok: true } });
    const requirement = { resource: writePermission.resource, name: writePermission.name };

    router = Router.from(
      routes({ middleware: loggerDecorator(logger) })
        .route({ method: 'GET', path: '/auth', middleware: auth.requireAuth(), handler: ok })
        .route({ method: 'POST', path: '/auth', middleware: auth.requireAuth(), handler: ok })
        .route({ method: 'PUT', path: '/auth', middleware: auth.requireAuth(), handler: ok })
        .route({ method: 'PATCH', path: '/auth', middleware: auth.requireAuth(), handler: ok })
        .route({ method: 'DELETE', path: '/auth', middleware: auth.requireAuth(), handler: ok })
        .route({
          method: 'POST',
          path: '/permission',
          middleware: auth.requirePermission(requirement),
          handler: ok,
        })
        .route({
          method: 'POST',
          path: '/both',
          middleware: auth.requireAuth().pipe(auth.requirePermission(requirement)),
          handler: ok,
        })
    );
  });

  beforeEach(() => {
    spyVerifySession = spyOn(service, 'verifySession').mockResolvedValue(mockSessionUser);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function request(
    method: string,
    path: string,
    options: { accessToken?: string; csrfCookie?: string; csrfHeader?: string } = {}
  ): Request {
    const cookies: string[] = [];
    if (options.accessToken !== undefined) {
      cookies.push(`${config.accessToken.cookie.name}=${options.accessToken}`);
    }
    if (options.csrfCookie !== undefined) {
      cookies.push(`${config.csrfToken.cookie.name}=${options.csrfCookie}`);
    }
    const headers = new Headers({ cookie: cookies.join('; ') });
    if (options.csrfHeader !== undefined) {
      headers.set(config.csrfToken.headerName, options.csrfHeader);
    }
    return new Request(`http://localhost${path}`, { method, headers });
  }

  function withCsrf(method: string, path: string, token = service.csrfToken('session-1')): Request {
    return request(method, path, { accessToken: 'token', csrfCookie: token, csrfHeader: token });
  }

  test('should return 401 without access token', async () => {
    const response = await router.handle(request('POST', '/auth'));

    expect(response.status).toEqual(401);
    expect(spyVerifySession).not.toHaveBeenCalled();
  });

  test('should return 401 with an invalid access token', async () => {
    spyVerifySession.mockRejectedValue(new Error('invalid signature'));

    const response = await router.handle(withCsrf('POST', '/auth'));

    expect(response.status).toEqual(401);
  });

  test('should not require a csrf token on GET', async () => {
    const response = await router.handle(request('GET', '/auth', { accessToken: 'token' }));

    expect(spyVerifySession).toHaveBeenCalledWith('token', expect.any(Object));
    expect(response.status).toEqual(200);
  });

  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    test(`should require a csrf token on ${method}`, async () => {
      const response = await router.handle(request(method, '/auth', { accessToken: 'token' }));

      expect(response.status).toEqual(403);
      expect(await response.json()).toEqual({
        error: 'Invalid or missing CSRF token',
        code: 'INVALID_CSRF_TOKEN',
      });
    });

    test(`should accept a valid csrf token on ${method}`, async () => {
      const response = await router.handle(withCsrf(method, '/auth'));

      expect(response.status).toEqual(200);
    });
  }

  test('should reject a csrf header without cookie', async () => {
    const token = service.csrfToken('session-1');
    const response = await router.handle(
      request('POST', '/auth', { accessToken: 'token', csrfHeader: token })
    );

    expect(response.status).toEqual(403);
  });

  test('should reject mismatching csrf header and cookie', async () => {
    const response = await router.handle(
      request('POST', '/auth', {
        accessToken: 'token',
        csrfCookie: service.csrfToken('session-1'),
        csrfHeader: 'other',
      })
    );

    expect(response.status).toEqual(403);
  });

  test('should reject a csrf token bound to another session', async () => {
    const response = await router.handle(withCsrf('POST', '/auth', service.csrfToken('session-2')));

    expect(response.status).toEqual(403);
  });

  test('should require a csrf token with requirePermission alone', async () => {
    const missing = await router.handle(request('POST', '/permission', { accessToken: 'token' }));
    const valid = await router.handle(withCsrf('POST', '/permission'));

    expect(missing.status).toEqual(403);
    expect(await missing.json()).toMatchObject({ code: 'INVALID_CSRF_TOKEN' });
    expect(valid.status).toEqual(200);
  });

  test('should verify the session once when requireAuth and requirePermission are chained', async () => {
    const missing = await router.handle(request('POST', '/both', { accessToken: 'token' }));
    expect(missing.status).toEqual(403);

    spyVerifySession.mockClear();
    const valid = await router.handle(withCsrf('POST', '/both'));
    expect(valid.status).toEqual(200);
    expect(spyVerifySession).toHaveBeenCalledTimes(1);
  });

  test('should still check permissions after the csrf token', async () => {
    spyVerifySession.mockResolvedValue({ ...mockSessionUser, permissions: [] });

    const response = await router.handle(withCsrf('POST', '/permission'));

    expect(response.status).toEqual(403);
    expect(await response.json()).toMatchObject({ code: 'INSUFFICIENT_PERMISSIONS' });
  });
});
