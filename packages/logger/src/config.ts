import { Type, type Static } from '@sinclair/typebox';

export type LogLevel = Static<typeof LogLevel>;
export const LogLevel = Type.Union([
  Type.Literal('debug'),
  Type.Literal('info'),
  Type.Literal('warn'),
  Type.Literal('error'),
  Type.Literal('fatal'),
  Type.Literal('silent'),
]);

export type Config = Static<typeof Config>;
export const Config = Type.Object({
  level: LogLevel,
  serviceName: Type.String(),
});
