import { Type, type Static } from '@sinclair/typebox';
import { User } from '../user/data';

export type Auth = Static<typeof Auth>;
export const Auth = Type.Object({
  userId: Type.Number(),
  provider: Type.String(),
  providerId: Type.Number(),

  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

export type CreateAuth = Static<typeof CreateAuth>;
export const CreateAuth = Type.Object({
  userId: Auth.properties.userId,
  provider: Auth.properties.provider,
  providerId: Auth.properties.providerId,
});

export type Tokens = Static<typeof Tokens>;
export const Tokens = Type.Object({
  access: Type.String(),
  refresh: Type.String(),
});

export type AuthCookies = Static<typeof AuthCookies>;
export const AuthCookies = Type.Object({
  access: Type.String(),
  refresh: Type.String(),
});

export type Provider = Static<typeof Provider>;
export const Provider = Type.Object({
  name: Auth.properties.provider,
  userId: Auth.properties.providerId,
});

export type AuthUser = Static<typeof AuthUser>;
export const AuthUser = Type.Object({
  tokens: Tokens,
  cookies: AuthCookies,
  // redirect: Type.String(),
});

export type JwtAccessToken = Static<typeof JwtAccessToken>;
export const JwtAccessToken = Type.Object({
  iss: Type.String(),
  aud: Type.String(),
  exp: Type.Number(),
  sub: User.properties.id,

  username: User.properties.username,
});

export type JwtRefreshToken = Static<typeof JwtRefreshToken>;
export const JwtRefreshToken = Type.Object({
  iss: Type.String(),
  aud: Type.String(),
  exp: Type.Number(),
  sub: User.properties.id,
});
