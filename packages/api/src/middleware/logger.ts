import type { Logger } from '@codeduel-backend-crab/logger';
import type { Middleware } from '@glass-cannon/router/middleware';

export function logRequests(logger: Logger): Middleware {
  return async (next, context) => {
    const startTime = performance.now();

    const response = await next(context);

    const { method, route } = context;
    const trace = 'trace' in context ? context.trace : null;
    const duration = performance.now() - startTime;
    const { status } = response;

    logger.info('request', 'Request completed', {
      method,
      route: route.path,
      status,
      durationMs: Math.round(duration),
      trace,
    });

    return response;
  };
}
