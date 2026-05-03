import type { Logger } from '@codeduel-backend-crab/logger';
import type { Middleware } from '@glass-cannon/router/middleware';
import { readJson, readText, type ResponseBody } from '@glass-cannon/server-bun';
import { TransformStream, type ReadableStream } from 'stream/web';

export function logRequests(logger: Logger): Middleware {
  return async (next, context) => {
    const { method, params, route, url } = context;
    const body = 'body' in context ? context.body : null;
    logger.debug('request', 'request received', {
      method,
      route: route.path,
      params,
      query: url.searchParams.toJSON(),
      body,
    });
    const response = await next(context);
    const { status, headers: responseHeaders, body: responseBody } = response;
    const reponseContentType = responseHeaders?.get('Content-Type');
    logger.debug('response', 'response sent', {
      response: {
        status,
        headers: responseHeaders?.toJSON() ?? {},
        body: responseBody && readResponseBody(responseBody, reponseContentType),
      },
    });
    return response;
  };
}

function readResponseBody(body: ResponseBody, contentType: string | null | undefined): unknown {
  if (contentType?.includes('application/json')) {
    const { readable, writable } = new TransformStream<Uint8Array>();
    void body(writable).then(() => writable.close());
    return readJson(readable as ReadableStream<Uint8Array>);
  }

  if (contentType?.includes('text/')) {
    const { readable, writable } = new TransformStream<Uint8Array>();
    void body(writable).then(() => writable.close());
    return readText(readable as ReadableStream<Uint8Array>);
  }

  return undefined;
}
