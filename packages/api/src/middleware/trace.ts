import type { Middleware } from '@glass-cannon/router/middleware';
import { createTrace, parseTrace, type TraceContext } from '../utils/trace';
import type { Logger } from '@codeduel-backend-crab/logger';

export function traceRequests(logger: Logger): Middleware<{ trace: string }> {
  return async (next, { headers }) => {
    const traceparentheader = headers.get('traceparent');
    let traceparent: TraceContext | undefined;
    try {
      traceparent = traceparentheader ? parseTrace(traceparentheader) : undefined;
    } catch (error) {
      logger.warn('trace.parse', `failed to parse traceparent header '${traceparentheader}'`, {
        error: logger.errorData(error),
      });
    }
    const trace = createTrace({
      version: traceparent?.version,
      traceId: traceparent?.traceId,
      flags: traceparent?.flags,
    });
    const response = await next({ trace });
    response.headers ??= new Headers();
    response.headers.set('traceparent', trace);
    return response;
  };
}
