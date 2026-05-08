import type { Middleware } from '@glass-cannon/router/middleware';
import { text } from '@glass-cannon/server-bun';

export const defaultErrorHandler: Middleware = (next) => {
  try {
    return next({});
  } catch {
    return text({ status: 500, body: 'Internal Server Error' });
  }
};

export const descriptiveErrorHandler: Middleware = (next) => {
  try {
    return next({});
  } catch (error) {
    if (error instanceof Error) {
      return text({ status: 500, body: error.stack ?? error.toString() });
    }
    return text({ status: 500, body: String(error) });
  }
};
