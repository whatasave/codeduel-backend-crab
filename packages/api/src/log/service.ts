import type { RouteContext } from '@glass-cannon/router';
import { CompositeLogger } from './logger';
import { readJson, readText, type Response } from '@glass-cannon/server-bun';
import type { Middleware } from '@glass-cannon/router/middleware';
import type { Config, RequestSanitizerOptions } from './config';
import { LoggerFactory } from './loggerFactory';
import type { ReadableStream } from 'node:stream/web';

export interface Log<T> {
  date: number;
  type: string;
  message: T;
}

export class LoggerService {
  private readonly logger: CompositeLogger<Log<unknown>>;
  private readonly sanitizer: RequestSanitizerOptions;

  static init(config: Config): LoggerService {
    const logger = new LoggerService(config);

    process.on('unhandledRejection', (error) => {
      logger.error(error, 'Unhandled Promise Rejection').catch((logError: unknown) => {
        const stack = errorToString(error);
        const logStack = errorToString(logError);
        console.error(`Unable to log error:\n${logStack}\nOriginal error:\n${stack}`);
      });
    });

    return logger;
  }

  private constructor({ loggers, sanitizer }: Config) {
    const factory = new LoggerFactory();
    this.logger = new CompositeLogger<Log<unknown>>(factory.createComposite(loggers));
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

      const jsonRequest = JSON.stringify(this.sanitizeRequest(context));
      void this.error(error, jsonRequest, `request.${context.route.path}`).catch(
        (logError: unknown) => {
          const stack = errorToString(error);
          const logStack = errorToString(logError);
          console.error(`Unable to log error:\n${logStack}\nOriginal error:\n${stack}`);
        }
      );

      throw error;
    }
  };

  async log(type: string, message: unknown): Promise<void> {
    return await this.logger.log({ date: Date.now(), type, message });
  }

  async error(error: unknown, message?: string, type?: string): Promise<void> {
    const stack = errorToString(error);

    return await this.logger.log({
      date: Date.now(),
      type: type ? `error.${type}` : 'error',
      message: message ? `${message}\n${stack}` : stack,
    });
  }

  async warn(message: string): Promise<void> {
    return await this.logger.log({ date: Date.now(), type: 'warn', message });
  }

  async logRequest(
    request: RouteContext,
    response: Response | undefined,
    error: unknown,
    executionTime: number
  ): Promise<void> {
    let type = `request.${request.route.path}`;
    if (request.route.method) type += `.${request.route.method.toLowerCase()}`;

    return await this.logger.log({
      date: Date.now(),
      type,
      message: JSON.stringify({
        request: this.sanitizeRequest(request),
        response: response ? await this.sanitizeResponse(response, request) : undefined,
        error: error ? errorToString(error) : undefined,
        executionTime,
      }),
    });
  }

  private sanitizeRequest(request: RouteContext): Record<string, unknown> {
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
  ): Promise<Record<string, unknown>> {
    const headers = this.sanitizeHeaders(response.headers);

    let body = undefined;
    if (response.body && !this.sanitizer.secretResponses.includes(request.route.path)) {
      const { readable, writable } = new TransformStream<Uint8Array>();
      void response.body(writable).then(() => writable.close());
      switch (response.headers?.get('content-type')) {
        case 'application/json':
          body = await readJson(readable as unknown as ReadableStream<Uint8Array>);
          break;
        case 'text/plain':
        case 'text/html':
          body = await readText(readable as unknown as ReadableStream<Uint8Array>);
          break;
      }
    }

    return {
      status: response.status,
      headers,
      body,
    };
  }

  private sanitizeHeaders(headers: Headers | undefined): Record<string, unknown> {
    if (!headers) return {};

    const result: Record<string, unknown> = {};
    for (const allowedHeader of this.sanitizer.allowedHeaders) {
      const value = headers.get(allowedHeader);
      if (value !== null) {
        result[allowedHeader] = value;
      }
    }
    return result;
  }
}

function errorToString(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.toString();
  return JSON.stringify(error, Object.getOwnPropertyNames(error));
}
