import type { Logger } from '@codeduel-backend-crab/logger';
import type { Middleware } from '@glass-cannon/router/middleware';

export function logRequests(logger: Logger): Middleware {
  return async (next, context) => {
    const startTime = performance.now();

    const response = await next(context);

    const { route } = context;
    const trace = 'trace' in context ? context.trace : null;
    const duration = performance.now() - startTime;
    const { status } = response;

    logger.info('request.completed', 'Request completed', {
      route: { method: route.method, path: route.path },
      status,
      durationMs: Math.round(duration),
      trace,
    });

    return response;
  };
}

export function loggerDecorator(logger: Logger): Middleware<{ logger: Logger }> {
  return async (next, context) => {
    const trace = 'trace' in context ? context.trace : null;
    const route = context.route;
    return next({
      logger: logger.group({
        context: {
          route: { method: route.method, path: route.path },
          trace,
        },
      }),
    });
  };
}
