import { Type, type Static } from '@sinclair/typebox';

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
