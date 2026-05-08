import { Type, type Static } from '@sinclair/typebox';
import { User } from '../user/data';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { Permission } from '../permission/data';

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

export type Provider = Static<typeof Provider>;
export const Provider = Type.Object({
  name: Auth.properties.provider,
  userId: Auth.properties.providerId,
});

export type JwtAccessToken = Static<typeof JwtAccessToken>;
export const JwtAccessToken = Type.Object({
  iss: Type.String(),
  aud: Type.String(),
  exp: Type.Number(),
  sub: User.properties.id,

  username: User.properties.username,
  permissions: Type.Array(Permission.properties.id),
});

export type JwtRefreshToken = Static<typeof JwtRefreshToken>;
export const JwtRefreshToken = Type.Object({
  iss: Type.String(),
  aud: Type.String(),
  exp: Type.Number(),
  jti: Type.String(),
  sub: User.properties.id,
});

export type State = Static<typeof State>;
export const State = Type.Object({
  csrfToken: Type.String(),
  redirect: Type.String(),
  ip: Type.Optional(Type.String()),
  userAgent: Type.Optional(Type.String()),
});

export const stateValidator = TypeCompiler.Compile(State);

export type AuthSession = Static<typeof AuthSession>;
export const AuthSession = Type.Object({
  id: Type.Number(),
  userId: User.properties.id,
  tokenId: Type.Optional(Type.String()),
  ip: Type.Optional(Type.String()),
  userAgent: Type.Optional(Type.String()),
  provider: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

export type CreateAuthSession = Static<typeof CreateAuthSession>;
export const CreateAuthSession = Type.Object({
  userId: AuthSession.properties.userId,
  tokenId: AuthSession.properties.tokenId,
  ip: AuthSession.properties.ip,
  userAgent: AuthSession.properties.userAgent,
  provider: AuthSession.properties.provider,
});

export type SessionUser = Static<typeof SessionUser>;
export const SessionUser = Type.Object({
  id: User.properties.id,
  username: User.properties.username,
  permissions: Type.Array(Permission),
});

export type CreateContext = Static<typeof CreateContext>;
export const CreateContext = Type.Object({
  auth: Auth,
  user: User,
  permissions: Type.Array(Permission),
});
