import { Type, type Static } from '@sinclair/typebox';

import { CookieOptions } from '@/utils/cookie';

import { Config as GithubConfig } from './github/config';
import { Config as GitlabConfig } from './gitlab/config';

export type Config = Static<typeof Config>;
export const Config = Type.Object({
  jwt: Type.Object({
    issuer: Type.String(),
    audience: Type.String(),
  }),
  accessToken: Type.Object({
    secret: Type.String(),
    expiresIn: Type.Number(),
    cookie: CookieOptions,
  }),
  refreshToken: Type.Object({
    secret: Type.String(),
    expiresIn: Type.Number(),
    cookie: CookieOptions,
  }),
  csrfToken: Type.Object({
    secret: Type.String({ minLength: 1 }),
    headerName: Type.String({ minLength: 1, default: 'X-CSRF-Token' }),
    cookie: CookieOptions,
  }),
  userDefaultRole: Type.String(),

  github: GithubConfig,
  gitlab: GitlabConfig,
});

/**
 * Checks that the auth cookies have safe attributes.
 * Returns the list of problems, empty when the configuration is safe.
 */
export function validateCookies(config: Config): string[] {
  const errors: string[] = [];

  if (config.accessToken.cookie.httpOnly !== true) {
    errors.push('accessToken.cookie: must be HttpOnly');
  }
  if (config.refreshToken.cookie.httpOnly !== true) {
    errors.push('refreshToken.cookie: must be HttpOnly');
  }
  if (config.csrfToken.cookie.httpOnly === true) {
    errors.push('csrfToken.cookie: must not be HttpOnly, the frontend has to read it');
  }
  if (config.csrfToken.cookie.path !== undefined && config.csrfToken.cookie.path !== '/') {
    errors.push('csrfToken.cookie: path must be "/" so the frontend can read it');
  }

  const cookies = {
    accessToken: config.accessToken.cookie,
    refreshToken: config.refreshToken.cookie,
    csrfToken: config.csrfToken.cookie,
  };
  for (const [name, cookie] of Object.entries(cookies)) {
    if (cookie.sameSite === 'None' && cookie.secure !== true) {
      errors.push(`${name}.cookie: SameSite=None requires Secure`);
    }
  }

  return errors;
}
