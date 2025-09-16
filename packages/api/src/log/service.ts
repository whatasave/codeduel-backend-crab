import type { RouteContext } from '@glass-cannon/router';
import { type Logger } from './logger';
import { readJson, readText, type Response, type ResponseBody } from '@glass-cannon/server-bun';
import type { Middleware } from '@glass-cannon/router/middleware';
import type { Config, RequestSanitizerOptions } from './config';
import { LoggerFactory } from './loggerFactory';
import type { ReadableStream } from 'node:stream/web';

export interface Log<T> {
  date: number;
  type: string;
  message: T;
  error?: unknown;
}

export interface Request {
  request: {
    route: {
      method?: string;
      path: string;
    };
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: unknown;
  };
  response?: {
    status: number;
    headers: Record<string, string>;
    body?: unknown;
  };
}

export class LoggerService {
  private readonly logger: Logger<Log<string>>;
  private readonly requestLogger: Logger<Log<Request>>;
  private readonly sanitizer: RequestSanitizerOptions;

  private static loggerExceptionHandler = (reason: unknown): void => {
    console.error('Failed to log message:');
    console.error(reason);
  };

  static init(config: Config): LoggerService {
    const logger = new LoggerService(config);

    process.on('unhandledRejection', (error) => {
      logger
        .error('Unhandled promise rejection', error)
        .catch(LoggerService.loggerExceptionHandler);
    });

    return logger;
  }

  private constructor({ loggers, sanitizer }: Config) {
    const factory = new LoggerFactory();
    this.logger = factory.createCompositeString(loggers);
    this.requestLogger = factory.createCompositeRequest(loggers);
    this.sanitizer = sanitizer;
  }

  middleware: Middleware = async (next, context) => {
    const start = Date.now();
    try {
      const response = await next(context);
      void this.logRequest(context, response, undefined, Date.now() - start);
      return response;
    } catch (error) {
      void this.logRequest(context, undefined, error, Date.now() - start);
      throw error;
    }
  };

  async log(type: string, message: string, error?: unknown): Promise<void> {
    return await this.logger
      .log({ date: Date.now(), type, message, error })
      .catch(LoggerService.loggerExceptionHandler);
  }

  async error(message: string, error?: unknown, type?: string): Promise<void> {
    type = type !== undefined ? `error.${type}` : 'error';
    return await this.log(type, message, error);
  }

  async warn(message: string, error?: unknown, type?: string): Promise<void> {
    type = type !== undefined ? `warn.${type}` : 'warn';
    return await this.log(type, message, error);
  }

  async logRequest(
    request: RouteContext,
    response: Response | undefined,
    error: unknown,
    executionTime: number
  ): Promise<void> {
    let type = `request.${request.route.path}`;
    if (request.route.method) type += `.${request.route.method.toLowerCase()}`;

    const message = {
      request: this.sanitizeRequest(request),
      response: response ? await this.sanitizeResponse(response, request) : undefined,
      executionTime,
    };

    const date = Date.now();

    await Promise.allSettled([
      this.logger
        .log({ date, type, message: JSON.stringify(message), error })
        .catch(LoggerService.loggerExceptionHandler),
      this.requestLogger
        .log({ date, type, message, error })
        .catch(LoggerService.loggerExceptionHandler),
    ]);
  }

  private sanitizeRequest(request: RouteContext): Request['request'] {
    const headers = this.sanitizeHeaders(request.headers);

    const body =
      'body' in request && this.sanitizer.secretRequests.includes(request.route.path)
        ? request.body
        : undefined;

    const url = new URL(request.url);
    if (this.sanitizer.secretRequests.includes(request.route.path)) {
      url.search = '';
    }

    return {
      route: {
        method: request.route.method,
        path: request.route.path,
      },
      url: url.toJSON(),
      method: request.method,
      headers,
      body,
    };
  }

  private async sanitizeResponse(
    response: Response,
    request: RouteContext
  ): Promise<Request['response']> {
    const headers = this.sanitizeHeaders(response.headers);

    let body = undefined;
    if (response.body && !this.sanitizer.secretResponses.includes(request.route.path)) {
      switch (response.headers?.get('content-type')) {
        case 'application/json':
          body = await readJson(readableFromResponseBody(response.body));
          break;
        case 'text/plain':
        case 'text/html':
          body = await readText(readableFromResponseBody(response.body));
          break;
      }
    }

    return {
      status: response.status,
      headers,
      body,
    };
  }

  private sanitizeHeaders(headers: Headers | undefined): Record<string, string> {
    if (!headers) return {};

    const result: Record<string, string> = {};
    for (const allowedHeader of this.sanitizer.allowedHeaders) {
      const value = headers.get(allowedHeader);
      if (value !== null) {
        result[allowedHeader] = value;
      }
    }
    return result;
  }
}

function readableFromResponseBody(body: ResponseBody): ReadableStream<Uint8Array> {
  const { readable, writable } = new TransformStream<Uint8Array>();
  void body(writable).then(() => writable.close());
  return readable as unknown as ReadableStream<Uint8Array>;
}
