import { describe, expect, test } from 'bun:test';
import { use, type Middleware } from './middleware';
import type { Route } from './types';

describe('middleware', () => {
  const double: Middleware = (route) => ({
    ...route,
    handler: async (request) => {
      const { body } = await route.handler(request);
      return { status: 200, body: (body as number) * 2 };
    },
  });

  const increment: Middleware = (route) => ({
    ...route,
    handler: async (request) => {
      const { body } = await route.handler(request);
      return { status: 200, body: (body as number) + 1 };
    },
  });

  test('should respect order', async () => {
    class TestController {
      @use(double, increment)
      route: Route = {
        method: 'GET',
        path: '/test',
        handler: async () => ({ status: 200, body: 4 }),
      };
    }

    const controller = new TestController();
    const response = await controller.route.handler({
      method: 'GET',
      path: '/test',
      query: {},
      body: {},
      params: {},
      headers: new Headers(),
    });
    expect(response).toEqual({ status: 200, body: 9 });
  });
});
