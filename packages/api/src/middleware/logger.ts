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

    logger.info('request.completed', 'Request completed', {
      method,
      route: route.path,
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
    const type = context.route.method
      ? `${context.route.path}.${context.route.method.toLowerCase()}`
      : context.route.path;
    return next({ logger: logger.group({ type, context: { trace } }) });
  };
}
