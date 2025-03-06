import { test, beforeEach, describe, expect } from 'bun:test';
import { Router } from './router';

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
});
