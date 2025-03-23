import { test, beforeEach, describe, expect } from 'bun:test';
import { Router } from './router';
import { Type } from '@sinclair/typebox';
import type { Middleware } from './middleware';
import type { Route } from './types';

describe('Router', () => {
  let router: Router;

  beforeEach(() => {
    router = new Router();
  });

  test('should return 404 for unknown routes', async () => {
    const response = await router.handle({
      method: 'GET',
      path: '/unknown',
      query: {},
      params: {},
      body: undefined,
    });
    expect(response.status).toBe(404);
  });

  test('should handle registered routes', async () => {
    router.route({
      method: 'GET',
      path: '/test',
      handler: async () => ({ status: 200, body: 'OK' }),
    });
    const response = await router.handle({
      method: 'GET',
      path: '/test',
      query: {},
      params: {},
      body: undefined,
    });
    expect(response.status).toBe(200);
    expect(response.body).toBe('OK');
  });

  test('should return 404 for incorrect method', async () => {
    router.route({
      method: 'POST',
      path: '/only-post',
      handler: async () => ({ status: 200 }),
    });
    const response = await router.handle({
      method: 'GET',
      path: '/only-post',
      query: {},
      params: {},
      body: undefined,
    });
    expect(response.status).toBe(404);
  });

  test('should handle nested routes', async () => {
    router.route({
      method: 'GET',
      path: '/nested/path',
      handler: async () => ({ status: 200 }),
    });
    const response = await router.handle({
      method: 'GET',
      path: '/nested/path',
      query: {},
      params: {},
      body: undefined,
    });
    expect(response.status).toBe(200);
  });

  test('should handle route groups', async () => {
    const group = router.group({ prefix: '/api' });
    group.route({
      method: 'GET',
      path: '/test',
      handler: async () => ({ status: 200 }),
    });
    const response = await router.handle({
      method: 'GET',
      path: '/api/test',
      query: {},
      params: {},
      body: undefined,
    });
    expect(response.status).toBe(200);
  });

  test('should handle routes without path', async () => {
    router.route({
      method: 'GET',
      handler: async () => ({ status: 200 }),
    });
    const response = await router.handle({
      method: 'GET',
      path: '/hello/world',
      query: {},
      params: {},
      body: undefined,
    });
    expect(response.status).toBe(200);
  });

  test('should handle routes without method', async () => {
    router.route({
      path: '/test',
      handler: async () => ({ status: 200 }),
    });
    const response = await router.handle({
      method: 'POST',
      path: '/test',
      query: {},
      params: {},
      body: undefined,
    });
    expect(response.status).toBe(200);
  });

  test('should return all registered routes', () => {
    router.route({ method: 'GET', path: '/a', handler: async () => ({ status: 200 }) });
    router.route({ method: 'POST', path: '/b', handler: async () => ({ status: 201 }) });
    const group = router.group({ prefix: '/a' });
    group.route({ method: 'GET', path: '/a', handler: async () => ({ status: 200 }) });
    group.route({ method: 'POST', path: '/b', handler: async () => ({ status: 201 }) });

    const routes = Array.from(router.allRoutes());
    expect(routes).toHaveLength(4);
    expect(routes.some((r) => r.path === '/a' && r.method === 'GET')).toBe(true);
    expect(routes.some((r) => r.path === '/b' && r.method === 'POST')).toBe(true);
    expect(routes.some((r) => r.path === '/a/a' && r.method === 'GET')).toBe(true);
    expect(routes.some((r) => r.path === '/a/b' && r.method === 'POST')).toBe(true);
  });

  test('should generate OpenAPI schema', () => {
    router.route({
      method: 'GET',
      path: '/test',
      schema: {
        request: {
          query: {
            param: Type.String(),
          },
        },
        response: {
          200: Type.Object({
            status: Type.Number(),
          }),
        },
      },
      handler: async () => ({ status: 200 }),
    });

    const openapi = router.openapi();
    if (!openapi.paths) throw new Error('OpenAPI schema is empty');
    expect(openapi.paths['/test']).toBeDefined();
    if (!openapi.paths['/test']) throw new Error('OpenAPI schema is empty');
    expect(openapi.paths['/test'].get).toBeDefined();
    if (!openapi.paths['/test'].get) throw new Error('OpenAPI schema is empty');
    expect(openapi.paths['/test'].get.parameters).toHaveLength(1);
    expect(openapi.paths['/test'].get.responses).toBeDefined();
  });

  test('middleware should be applied to all routes in group', async () => {
    const double: Middleware = (route) => ({
      ...route,
      handler: async (request) => {
        const { body } = await route.handler(request);
        return { status: 200, body: (body as number) * 2 };
      },
    });
    const route: Route = {
      method: 'GET',
      path: '/test',
      handler: async () => ({ status: 200, body: 2 }),
    };
    const group = router.group({ prefix: '/api', middlewares: [double] });
    const nestedGroup = group.group({ prefix: '/nested' });
    const nestedGroupWithMiddleware = nestedGroup.group({
      prefix: '/middy',
      middlewares: [double],
    });
    router.route(route);
    group.route(route);
    nestedGroup.route(route);
    nestedGroupWithMiddleware.route(route);
    const response1 = await router.handle({
      method: 'GET',
      path: '/test',
      query: {},
      params: {},
      body: undefined,
    });
    const response2 = await router.handle({
      method: 'GET',
      path: '/api/test',
      query: {},
      params: {},
      body: undefined,
    });
    const response3 = await router.handle({
      method: 'GET',
      path: '/api/nested/test',
      query: {},
      params: {},
      body: undefined,
    });
    const response4 = await router.handle({
      method: 'GET',
      path: '/api/nested/middy/test',
      query: {},
      params: {},
      body: undefined,
    });
    expect(response1.body).toBe(2);
    expect(response2.body).toBe(4);
    expect(response3.body).toBe(4);
    expect(response4.body).toBe(8);
  });

  test('path parameters should work', async () => {
    router.route({
      method: 'GET',
      path: '/test/:id/test',
      handler: async (request) => ({ status: 200, body: request.params.id }),
    });
    const response = await router.handle({
      method: 'GET',
      path: '/test/123/test',
      query: {},
      params: {},
      body: undefined,
    });
    expect(response.body).toEqual('123');
  });

  test('specific path should take precedence over path parameters', async () => {
    router.route({
      method: 'GET',
      path: '/test/:id/test',
      handler: async () => ({ status: 200, body: 'generic' }),
    });
    router.route({
      method: 'GET',
      path: '/test/123/test',
      handler: async () => ({ status: 200, body: 'specific' }),
    });
    const response = await router.handle({
      method: 'GET',
      path: '/test/123/test',
      query: {},
      params: {},
      body: undefined,
    });
    expect(response.body).toBe('specific');
  });
});
