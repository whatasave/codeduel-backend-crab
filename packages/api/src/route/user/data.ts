import { Type, type Static } from '@sinclair/typebox';

export type User = Static<typeof User>;
export const User = Type.Object({
  id: Type.Number(),
  username: Type.String(),

  name: Type.Optional(Type.String()),
  avatar: Type.Optional(Type.String()),
  backgroundImage: Type.Optional(Type.String()),
  biography: Type.Optional(Type.String()),

  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

export type CreateUser = Static<typeof CreateUser>;
export const CreateUser = Type.Object({
  username: Type.String(),
  name: Type.Optional(Type.String()),
  avatar: Type.Optional(Type.String()),
  backgroundImage: Type.Optional(Type.String()),
  biography: Type.Optional(Type.String()),
});
