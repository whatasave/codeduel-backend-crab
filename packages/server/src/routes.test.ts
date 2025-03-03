import { test } from 'bun:test';
import { Type } from '@sinclair/typebox';
import { Router } from './router';

test('openapi works', async () => {
  const router = new Router();
  router.routes({
    prefix: '/healthcheck',
    routes: [
      {
        method: 'GET',
        path: '/test',
        schema: {
          request: {
            query: {},
            body: Type.Undefined(),
          },
          response: {
            200: Type.Literal('ok'),
          },
        },
        handler: async () => ({ status: 200, body: 'ok' }) as const,
      },
      {
        method: 'POST',
        path: '/',
        schema: {
          request: {
            query: {},
            body: Type.Undefined(),
          },
          response: {
            200: Type.Literal('ok'),
          },
        },
        handler: async () => ({ status: 200, body: 'ok' }) as const,
      },
      {
        prefix: '/test',
        routes: [
          {
            routes: [
              {
                method: 'GET',
                path: '/test',
                schema: {
                  request: {
                    query: {},
                    body: Type.Undefined(),
                  },
                  response: {
                    200: Type.Literal('ok'),
                  },
                },
                handler: async () => ({ status: 200, body: 'ok' }) as const,
              },
            ],
          },
        ],
      },
    ],
  });

  const json = router.openapi();
  console.log(JSON.stringify(json, null, 2));

  const response = await router.handle({
    method: 'GET',
    path: '/healthcheck/test/test',
    query: {},
    headers: new Headers(),
    body: undefined,
  });

  console.log(response);
});
