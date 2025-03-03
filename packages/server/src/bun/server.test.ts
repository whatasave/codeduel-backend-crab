import { expect, test } from 'bun:test';
import { BunServer } from './server';

test('server works', async () => {
  const server = new BunServer(async (request) => {
    return {
      status: 200,
      body: request.body,
    };
  });

  const response = await server.handle({
    method: 'GET',
    path: '/',
    body: 'Hello, world!',
    query: {},
    headers: new Headers(),
  });

  expect(response.status).toBe(200);
  expect(response.body).toBe('Hello, world!');
});
