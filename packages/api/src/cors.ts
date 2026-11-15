import { cors } from '@glass-cannon/cors';
import type { Plugin } from '@glass-cannon/router';
import { Type, type Static } from '@sinclair/typebox';

export type CorsOptions = Static<typeof CorsOptions>;
export const CorsOptions = Type.Object({
  allowedOrigins: Type.Optional(Type.Union([Type.Array(Type.String()), Type.Undefined()])),
  allowedMethods: Type.Optional(Type.Union([Type.Array(Type.String()), Type.Undefined()])),
  allowedHeaders: Type.Optional(Type.Union([Type.Array(Type.String()), Type.Undefined()])),
  allowCredentials: Type.Optional(Type.Boolean()),
  exposeHeaders: Type.Optional(Type.Union([Type.Array(Type.String()), Type.Undefined()])),
  maxAge: Type.Optional(Type.Number()),
});

export function setupCors(config?: CorsOptions): Plugin | undefined {
  if (!config) return undefined;

  return cors({
    allowOrigin: (origin) => config.allowedOrigins?.includes(origin) ?? true,
    allowMethods: config.allowedMethods,
    allowHeaders: config.allowedHeaders,
    allowCredentials: config.allowCredentials,
    exposeHeaders: config.exposeHeaders,
    maxAge: config.maxAge,
  });
}
