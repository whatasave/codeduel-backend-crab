import { CorsOptions } from '@codeduel-backend-crab/server/cors';
import { Type, type Static } from '@sinclair/typebox';
import { Value, AssertError } from '@sinclair/typebox/value';

export type Config = Static<typeof Config>;
export const Config = Type.Object({
  host: Type.String({ default: 'localhost' }),
  port: Type.Number({ minimum: 0, maximum: 65535, default: 0 }),
  cors: Type.Optional(CorsOptions),
});

export function loadConfig(): Config {
  const env = process.env;
  const config = {
    host: env.HOST,
    port: env.PORT,
    cors: env.CORS_ALLOWED_ORIGINS
      ? {
          allowedOrigins: env.CORS_ALLOWED_ORIGINS.split(',').filter(Boolean),
          allowedMethods: env.CORS_ALLOWED_METHODS?.split(',').filter(Boolean),
          allowedHeaders: env.CORS_ALLOWED_HEADERS?.split(',').filter(Boolean),
          allowCredentials: env.CORS_ALLOW_CREDENTIALS === 'true',
        }
      : undefined,
  };

  try {
    return Value.Parse(Config, config);
  } catch (error) {
    if (error instanceof AssertError) {
      const errors = Array.from(error.Errors())
        .map((e) => `\t${e.path}: ${e.message}, Received: ${String(e.value)}`)
        .join('\n');
      throw new Error(`Invalid environment:\n${errors}`);
    }
    throw error;
  }
}

export function safeLoadConfig():
  | { config: Config; error?: never }
  | { config?: never; error: string } {
  try {
    return { config: loadConfig() };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    } else {
      return { error: String(error) };
    }
  }
}
