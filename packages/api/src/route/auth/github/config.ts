import { Type, type Static } from '@sinclair/typebox';
import { CookieOptions } from '../../../utils/cookie';

export type Config = Static<typeof Config>;
export const Config = Type.Object({
  clientId: Type.String(),
  clientSecret: Type.String(),
  redirectUri: Type.String(),
  stateCookie: CookieOptions,
});
