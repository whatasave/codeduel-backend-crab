import type { Middleware } from '@glass-cannon/router/middleware';
import { text } from '@glass-cannon/server-bun';
import type { Logger } from '@codeduel-backend-crab/logger';

export function defaultErrorHandler(logger: Logger): Middleware {
  return async (next) => {
    try {
      return await next({});
    } catch (error) {
      logger.error('response.error', 'cannot handle request', { error: logger.errorData(error) });
      return text({ status: 500, body: 'Internal Server Error' });
    }
  };
}

export function descriptiveErrorHandler(logger: Logger): Middleware {
  return async (next) => {
    try {
      return await next({});
    } catch (error) {
      logger.error('response.error', 'cannot handle request', { error: logger.errorData(error) });
      if (error instanceof Error) {
        return text({ status: 500, body: error.stack ?? error.toString() });
      }
      return text({ status: 500, body: String(error) });
    }
  };
}
