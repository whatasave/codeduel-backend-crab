import type { Logger } from '@codeduel-backend-crab/logger';
import { middleware, type MiddlewareWrapper } from '@glass-cannon/router/middleware';
import { text } from '@glass-cannon/server-bun';

export function errorHandler(
  descriptiveErrors: boolean
): MiddlewareWrapper<unknown, { logger: Logger }> {
  return descriptiveErrors ? descriptiveErrorHandler : defaultErrorHandler;
}

export const defaultErrorHandler = middleware<unknown, { logger: Logger }>(
  async (next, context) => {
    try {
      return await next(context);
    } catch (error) {
      const { logger } = context;
      logger.error('request.unhandledError', 'cannot handle request', {
        error: logger.errorData(error),
      });
      return text({ status: 500, body: 'Internal Server Error' });
    }
  }
);

export const descriptiveErrorHandler = middleware<unknown, { logger: Logger }>(
  async (next, context) => {
    try {
      return await next(context);
    } catch (error) {
      const { logger } = context;
      logger.error('request.unhandledError', 'cannot handle request', {
        error: logger.errorData(error),
      });
      if (error instanceof Error) {
        return text({ status: 500, body: error.stack ?? error.toString() });
      }
      return text({ status: 500, body: String(error) });
    }
  }
);
