import { CorsOptions } from '@codeduel-backend-crab/server/cors';
import { Type, type Static } from '@sinclair/typebox';
import { Value, AssertError } from '@sinclair/typebox/value';
import { Config as DBConfig } from '@codeduel-backend-crab/database';
import { Config as AuthConfig } from './route/auth/config';

export type Config = Static<typeof Config>;
export const Config = Type.Object({
  host: Type.String({ default: 'localhost' }),
  port: Type.Number({ minimum: 0, maximum: 65535, default: 0 }),
  descriptiveErrors: Type.Boolean(),
  cors: Type.Optional(CorsOptions),
  database: DBConfig,
  auth: AuthConfig,
});

export function loadConfig(): Config {
  const env = process.env;
  const config = {
    host: env.HOST,
    port: env.PORT,
    descriptiveErrors: env.DESCRIPTIVE_ERRORS,
    cors: env.CORS_ALLOWED_ORIGINS
      ? {
          allowedOrigins: env.CORS_ALLOWED_ORIGINS.split(',').filter(Boolean),
          allowedMethods: env.CORS_ALLOWED_METHODS?.split(',').filter(Boolean),
          allowedHeaders: env.CORS_ALLOWED_HEADERS?.split(',').filter(Boolean),
          allowCredentials: env.CORS_ALLOW_CREDENTIALS === 'true',
        }
      : undefined,
    database: {
      host: env.DATABASE_HOST,
      port: env.DATABASE_PORT,
      database: env.DATABASE_NAME,
      user: env.DATABASE_USER,
      password: env.DATABASE_PASSWORD,
      ssl: env.DATABASE_SSL === 'true',
      maxConnections: env.DATABASE_MAX_CONNECTIONS,
    },
    auth: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        redirectUri: env.GITHUB_REDIRECT_URI,
        stateCookie: {
          name: env.GITHUB_STATE_COOKIE_NAME,
          maxAge: env.GITHUB_STATE_COOKIE_MAX_AGE
            ? parseInt(env.GITHUB_STATE_COOKIE_MAX_AGE, 10)
            : undefined,
          domain: env.GITHUB_STATE_COOKIE_DOMAIN,
          path: env.GITHUB_STATE_COOKIE_PATH,
          httpOnly: env.GITHUB_STATE_COOKIE_HTTP_ONLY === 'true',
          secure: env.GITHUB_STATE_COOKIE_SECURE === 'true',
          sameSite: env.GITHUB_STATE_COOKIE_SAME_SITE,
        },
      },
      jwt: {
        secret: env.JWT_SECRET,
        expiresIn: env.JWT_EXPIRES_IN,
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
      },
      accessToken: {
        expiresIn: env.ACCESS_TOKEN_EXPIRES_IN,
      },
      refreshToken: {
        expiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
      },
    },
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
