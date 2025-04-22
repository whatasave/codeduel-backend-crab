import { Type, type Static } from '@sinclair/typebox';
import { Config as GithubConfig } from './github/config';

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
  }),
  refreshToken: Type.Object({
    expiresIn: Type.Number(),
  }),
});
