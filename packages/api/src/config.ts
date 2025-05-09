import { CorsOptions } from '@codeduel-backend-crab/server/cors';
import { Type, type Static } from '@sinclair/typebox';
import { Value, AssertError } from '@sinclair/typebox/value';
import { Config as DatabaseConfig } from '@codeduel-backend-crab/database';
import { Config as AuthConfig } from './route/auth/config';

export type Config = Static<typeof Config>;
export const Config = Type.Object({
  host: Type.String({ default: 'localhost' }),
  port: Type.Number({ minimum: 0, maximum: 65535, default: 0 }),
  descriptiveErrors: Type.Boolean(),
  cors: Type.Optional(CorsOptions),
  database: DatabaseConfig,
  auth: AuthConfig,
});

export function loadConfig(): Config {
  const env = process.env;

  const config = {
    host: env.HOST,
    port: env.PORT,
    descriptiveErrors: env.DESCRIPTIVE_ERRORS,
    cors: env.CORS_ALLOWED_ORIGINS && {
      allowedOrigins: env.CORS_ALLOWED_ORIGINS.split(',').filter(Boolean),
      allowedMethods: env.CORS_ALLOWED_METHODS?.split(',').filter(Boolean),
      allowedHeaders: env.CORS_ALLOWED_HEADERS?.split(',').filter(Boolean),
      allowCredentials: env.CORS_ALLOW_CREDENTIALS,
    },
    database: {
      host: env.DATABASE_HOST,
      port: env.DATABASE_PORT,
      database: env.DATABASE_NAME,
      user: env.DATABASE_USER,
      password: env.DATABASE_PASSWORD,
      ssl: env.DATABASE_SSL,
      maxConnections: env.DATABASE_MAX_CONNECTIONS,
    },
    auth: {
      jwt: {
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
      },
      accessToken: {
        expiresIn: env.ACCESS_TOKEN_EXPIRES_IN,
        secret: env.ACCESS_TOKEN_SECRET,
        cookie: {
          name: env.ACCESS_TOKEN_COOKIE_NAME,
          domain: env.ACCESS_TOKEN_COOKIE_DOMAIN,
          path: env.ACCESS_TOKEN_COOKIE_PATH,
          maxAge: env.ACCESS_TOKEN_COOKIE_MAX_AGE,
          httpOnly: env.ACCESS_TOKEN_COOKIE_HTTP_ONLY,
          secure: env.ACCESS_TOKEN_COOKIE_SECURE,
          sameSite: env.ACCESS_TOKEN_COOKIE_SAME_SITE,
        },
      },
      refreshToken: {
        expiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
        secret: env.REFRESH_TOKEN_SECRET,
        cookie: {
          name: env.REFRESH_TOKEN_COOKIE_NAME,
          domain: env.REFRESH_TOKEN_COOKIE_DOMAIN,
          path: env.REFRESH_TOKEN_COOKIE_PATH,
          maxAge: env.REFRESH_TOKEN_COOKIE_MAX_AGE,
          httpOnly: env.REFRESH_TOKEN_COOKIE_HTTP_ONLY,
          secure: env.REFRESH_TOKEN_COOKIE_SECURE,
          sameSite: env.REFRESH_TOKEN_COOKIE_SAME_SITE,
        },
      },
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        redirectUri: env.GITHUB_REDIRECT_URI,
        stateCookie: {
          name: env.GITHUB_STATE_COOKIE_NAME,
          domain: env.GITHUB_STATE_COOKIE_DOMAIN,
          path: env.GITHUB_STATE_COOKIE_PATH,
          maxAge: env.GITHUB_STATE_COOKIE_MAX_AGE,
          httpOnly: env.GITHUB_STATE_COOKIE_HTTP_ONLY,
          secure: env.GITHUB_STATE_COOKIE_SECURE,
          sameSite: env.GITHUB_STATE_COOKIE_SAME_SITE,
        },
      },
      gitlab: {
        applicationId: env.GITLAB_APPLICATION_ID,
        secret: env.GITLAB_SECRET,
        callbackUri: env.GITLAB_CALLBACK_URI,
        stateCookie: {
          name: env.GITLAB_STATE_COOKIE_NAME,
          domain: env.GITLAB_STATE_COOKIE_DOMAIN,
          path: env.GITLAB_STATE_COOKIE_PATH,
          maxAge: env.GITLAB_STATE_COOKIE_MAX_AGE,
          httpOnly: env.GITLAB_STATE_COOKIE_HTTP_ONLY,
          secure: env.GITLAB_STATE_COOKIE_SECURE,
          sameSite: env.GITLAB_STATE_COOKIE_SAME_SITE,
        },
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
