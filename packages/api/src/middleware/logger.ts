import type { Logger } from '@codeduel-backend-crab/logger';
import type { RouteContext } from '@glass-cannon/router';
import { middleware, type MiddlewareWrapper } from '@glass-cannon/router/middleware';

export const logRequests = middleware<unknown, { logger: Logger }>(async (next, context) => {
  const startTime = performance.now();

  const response = await next(context);

  const { logger } = context;
  const duration = performance.now() - startTime;
  const { status } = response;

  const log = {
    status,
    durationMs: Math.round(duration),
  };
  if (status >= 500) logger.warn('request.completed', 'Request completed with server error', log);
  else logger.info('request.completed', 'Request completed', log);

  return response;
});

export function loggerDecorator(logger: Logger): MiddlewareWrapper<{ logger: Logger }> {
  return middleware<{ logger: Logger }>(
    async (next, context: RouteContext & { trace?: string }) => {
      const { route, trace } = context;
      return await next({
        ...context,
        logger: logger.group({
          context: {
            route: { method: route.method, path: route.path },
            trace,
          },
        }),
      });
    }
  );
}
