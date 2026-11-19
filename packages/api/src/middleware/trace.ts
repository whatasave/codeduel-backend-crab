import type { Logger } from '@codeduel-backend-crab/logger';
import { middleware, type MiddlewareWrapper } from '@glass-cannon/router/middleware';

import { createTrace, parseTrace, type TraceContext } from '@/utils/trace';

export function traceRequests(logger: Logger): MiddlewareWrapper<{ trace: string }> {
  return middleware<{ trace: string }>(async (next, context) => {
    const traceParentHeader = context.request.headers.get('traceparent');
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
    const response = await next({ ...context, trace });
    response.headers.set('traceparent', trace);
    return response;
  });
}
