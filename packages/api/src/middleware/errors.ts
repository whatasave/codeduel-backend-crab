import type { Middleware } from '@glass-cannon/router/middleware';
import { text } from '@glass-cannon/server-bun';

export const defaultErrorHandler: Middleware = async (next) => {
  try {
    return await next({});
  } catch {
    return text({ status: 500, body: 'Internal Server Error' });
  }
};

export const descriptiveErrorHandler: Middleware = async (next, c) => {
  try {
    return await next({});
  } catch (error) {
    if (error instanceof Error) {
      return text({ status: 500, body: error.stack ?? error.toString() });
    }
    return text({ status: 500, body: String(error) });
  }
};
