import { Type, type Static } from '@sinclair/typebox';

export type Config = Static<typeof Config>;
export const Config = Type.Object({
  clientId: Type.String(),
  clientSecret: Type.String(),
  redirectUri: Type.String(),
});
