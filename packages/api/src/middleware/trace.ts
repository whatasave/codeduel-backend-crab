import type { Middleware } from '@glass-cannon/router/middleware';
import { createTrace, parseTrace, type TraceContext } from '../utils/trace';
import type { Logger } from '@codeduel-backend-crab/logger';

export function traceRequests(logger: Logger): Middleware<{ trace: string }> {
  return async (next, { headers }) => {
    const traceParentHeader = headers.get('traceparent');
    let traceParent: TraceContext | undefined;
    try {
      traceParent = traceParentHeader ? parseTrace(traceParentHeader) : undefined;
    } catch (error) {
      logger.warn('trace.parse', `failed to parse traceparent header '${traceParentHeader}'`, {
        error: logger.errorData(error),
      });
    }
    const trace = createTrace({
      version: traceParent?.version,
      traceId: traceParent?.traceId,
      flags: traceParent?.flags,
    });
    const response = await next({ trace });
    response.headers ??= new Headers();
    response.headers.set('traceparent', trace);
    return response;
  };
}
