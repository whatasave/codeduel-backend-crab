import { describe, expect, test } from 'bun:test';
import { validation } from '../validation';
import { Type } from '@sinclair/typebox';
import type { Handler, RouteSchema } from '../types';

describe('validation middleware', () => {
  const schema: RouteSchema = {
    request: {
      query: { name: Type.String() },
      body: Type.Object({ age: Type.Number() }),
    },
    response: Type.Object({ age: Type.Number() }),
  };
  const handler: Handler = async (req) => ({ status: 200, body: req.body });
  const validatedHandler = validation(schema, handler);

  test('should allow valid requests', async () => {
    const response = await validatedHandler({
      method: 'POST',
      path: '/',
      query: { name: 'John' },
      body: { age: 30 },
      params: {},
    });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ age: 30 });
  });

  test('should return 400 for invalid query parameters', async () => {
    const response = await validatedHandler({
      method: 'POST',
      path: '/',
      query: { name: {} },
      body: { age: 30 },
      params: {},
    });
    expect(response.status).toBe(400);
    expect(hasErrors(response.body)).toBe(true);
  });

  test('should return 400 for invalid body parameters', async () => {
    const schema: RouteSchema = {
      request: {
        params: { id: Type.Number() },
        query: { name: Type.String() },
        body: Type.Object({ age: Type.Number() }),
      },
      response: Type.Object({ age: Type.Number() }),
    };
    const handler: Handler = async (req) => ({ status: 200, body: req.params.id });
    const validatedHandler = validation(schema, handler);

    const response = await validatedHandler({
      method: 'POST',
      path: '/123',
      query: { name: 'John' },
      body: { age: 30 },
      params: { id: 'not a number' },
    });
    expect(response.status).toBe(400);
    expect(hasErrors(response.body)).toBe(true);
  });

  test('should return 400 for invalid body', async () => {
    const response = await validatedHandler({
      method: 'POST',
      path: '/',
      query: { name: 'John' },
      body: { age: 'not a number' },
      params: {},
    });
    expect(response.status).toBe(400);
    expect(hasErrors(response.body)).toBe(true);
  });

  test('should return 400 if body is missing when required', async () => {
    const response = await validatedHandler({
      method: 'POST',
      path: '/',
      query: { name: 'John' },
      body: undefined,
      params: {},
    });
    expect(response.status).toBe(400);
    expect(hasErrors(response.body)).toBe(true);
  });
});

function hasErrors(obj: unknown): obj is { errors: string[] } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'errors' in obj &&
    Array.isArray(obj.errors) &&
    obj.errors.every((e) => typeof e === 'string') &&
    obj.errors.length > 0
  );
}
