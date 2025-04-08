import { Type, type Static } from '@sinclair/typebox';

export type Config = Static<typeof Config>;
export const Config = Type.Object({
  clientId: Type.String(),
  clientSecret: Type.String(),
  redirectUri: Type.String(),
  stateCookie: Type.Object({
    name: Type.String(),
    maxAge: Type.Number(),
    domain: Type.String(),
    path: Type.String({
      default: '/auth/github/callback',
    }),
    httpOnly: Type.Boolean({}),
    secure: Type.Boolean(),
    sameSite: Type.String({
      default: 'Strict',
      enum: ['Strict', 'Lax', 'None'],
    }),
  }),
});
