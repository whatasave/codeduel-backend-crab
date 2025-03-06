import { describe, expect, test } from 'bun:test';
import { BunServer } from './server';
import { Router } from '../router';

describe('BunServer', () => {
  test('should handle requests with a custom handler', async () => {
    const server = new BunServer(async () => ({ status: 200, body: 'OK' }));
    const response = await server.handle({
      method: 'GET',
      path: '/',
      query: {},
      body: null,
      headers: new Headers(),
    });

    expect(response.status).toBe(200);
    expect(response.body).toBe('OK');
  });

  test('should support routing via Router instance', async () => {
    const router = new Router();
    router.route({
      method: 'GET',
      path: '/route',
      handler: async () => ({ status: 201, body: 'Created' }),
    });
    const server = new BunServer(router);
    const response = await server.handle({
      method: 'GET',
      path: '/route',
      query: {},
      body: null,
    });

    expect(response.status).toBe(201);
    expect(response.body).toBe('Created');
  });

  test('should return empty response when body is undefined', async () => {
    const server = new BunServer(async () => ({ status: 204 }));
    const response = await server.handle({
      method: 'GET',
      path: '/',
      query: {},
      body: null,
    });

    expect(response.status).toBe(204);
    expect(response.body).toBeUndefined();
  });

  test('should listen on a port', async () => {
    const server = new BunServer(async () => ({ status: 200, body: 'Hello World!' }));
    const runningServer = server.listen({ host: 'localhost', port: 0 });
    const response = await fetch(`http://${runningServer.host}:${runningServer.port}`);
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(body).toBe(JSON.stringify('Hello World!'));
    await runningServer.stop();
  });
});
