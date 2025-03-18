import type { Middleware } from '../middleware';
import { noContent } from '../responses';
import type { Route } from '../types';
import { Type, type Static } from '@sinclair/typebox';

export type CorsOptions = Static<typeof CorsOptions>;
export const CorsOptions = Type.Object({
  allowedOrigins: Type.Union([Type.Array(Type.String()), Type.Tuple([Type.Literal('*')])]),
  allowedMethods: Type.Optional(
    Type.Union([Type.Array(Type.String()), Type.Tuple([Type.Literal('*')])], {
      default: ['*'],
    })
  ),
  allowedHeaders: Type.Optional(Type.Array(Type.String(), { default: [] })),
  allowCredentials: Type.Optional(Type.Boolean({ default: false })),
});

export class Cors {
  private allowedOrigins: string[];
  private allowedMethods: string[];
  private allowedHeaders: string[];
  private allowCredentials: boolean;

  constructor(options: CorsOptions) {
    this.allowedOrigins = options.allowedOrigins;
    this.allowedMethods = options.allowedMethods ?? [];
    this.allowedHeaders = options.allowedHeaders ?? [];
    this.allowCredentials = options.allowCredentials ?? false;
    if (this.allowedMethods[0] === '*') {
      this.allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
    }
  }

  middleware: Middleware = (route) => ({
    ...route,
    handler: async (request) => {
      const response = await route.handler(request);
      const origin = request.headers?.get('Origin');
      if (!origin) return response;
      if (this.allowedOrigins[0] !== '*' && !this.allowedOrigins.includes(origin)) {
        return response;
      }
      response.headers ??= new Headers();
      response.headers.set('Access-Control-Allow-Origin', origin);
      if (this.allowedMethods.length > 0) {
        response.headers.set('Access-Control-Allow-Methods', this.allowedMethods.join(','));
      }
      if (this.allowedHeaders.length > 0) {
        response.headers.set('Access-Control-Allow-Headers', this.allowedHeaders.join(','));
      }
      response.headers.set('Access-Control-Allow-Credentials', this.allowCredentials.toString());
      return response;
    },
  });

  preflight: Route = {
    method: 'OPTIONS',
    handler: async (request) => {
      const origin = request.headers?.get('Origin');
      const headers = new Headers();
      if (origin && (this.allowedOrigins[0] === '*' || this.allowedOrigins.includes(origin))) {
        headers.set('Access-Control-Allow-Origin', origin);
        if (this.allowedMethods.length > 0) {
          headers.set('Access-Control-Allow-Methods', this.allowedMethods.join(','));
        }
        if (this.allowedHeaders.length > 0) {
          headers.set('Access-Control-Allow-Headers', this.allowedHeaders.join(','));
        }
        headers.set('Access-Control-Allow-Credentials', this.allowCredentials.toString());
      }
      return noContent(undefined, headers);
    },
  };
}
