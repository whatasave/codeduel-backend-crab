import { Type, type Static } from '@sinclair/typebox';
import { Config as GithubConfig } from './github/config';
import { CookieOptions } from '../../utils/cookie';

export type Config = Static<typeof Config>;
export const Config = Type.Object({
  github: GithubConfig,
  jwt: Type.Object({
    secret: Type.String(),
    issuer: Type.String(),
    audience: Type.String(),
  }),
  accessToken: Type.Object({
    expiresIn: Type.Number(),
    cookie: CookieOptions,
  }),
  refreshToken: Type.Object({
    expiresIn: Type.Number(),
    cookie: CookieOptions,
  }),
});
