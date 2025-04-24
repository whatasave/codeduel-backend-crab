import { Type, type Static } from '@sinclair/typebox';
import { CookieOptions } from '../../../utils/cookie';

export type Config = Static<typeof Config>;
export const Config = Type.Object({
  applicationId: Type.String(),
  secret: Type.String(),
  callbackUri: Type.String(),
  stateCookie: CookieOptions,
});
