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
    /** Seconds between two cleanups of expired refresh tokens. */
    cleanupInterval: Type.Number({ minimum: 1, default: 3600 }),
    cookie: CookieOptions,
  }),
  userDefaultRole: Type.String(),

  github: GithubConfig,
  gitlab: GitlabConfig,
});
