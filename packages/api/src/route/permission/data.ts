import { Type, type Static } from '@sinclair/typebox';

export type Permission = Static<typeof Permission>;
export const Permission = Type.Object({
  id: Type.Integer(),
  resource: Type.Optional(Type.String()),
  name: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

export type Role = Static<typeof Role>;
export const Role = Type.Object({
  id: Type.Integer(),
  name: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});
