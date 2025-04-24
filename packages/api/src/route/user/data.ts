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
  username: User.properties.username,
  name: User.properties.name,
  avatar: User.properties.avatar,
  backgroundImage: User.properties.backgroundImage,
  biography: User.properties.biography,
});

export class UserNameAlreadyExistsError extends Error {
  constructor(username: string) {
    super(`Username already exists: ${username}`);
    this.name = 'UserNameAlreadyExistsError';
  }
}
