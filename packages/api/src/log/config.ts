import { Type, type Static } from '@sinclair/typebox';

export type LoggerConfig = Static<typeof LoggerConfig>;
export const LoggerConfig = Type.Object({
  type: Type.Union([Type.Literal('console')]),
  options: Type.Record(Type.String(), Type.Any(), { default: {} }),
  enabled: Type.Optional(Type.Union([Type.Array(Type.String()), Type.Undefined()])),
  disabled: Type.Optional(Type.Union([Type.Array(Type.String()), Type.Undefined()])),
});

export type ConsoleLoggerConfig = Static<typeof ConsoleLoggerConfig>;
export const ConsoleLoggerConfig = Type.Object({
  locale: Type.Optional(Type.String()),
  showDate: Type.Boolean({ default: true }),
  showType: Type.Boolean({ default: true }),
});

export type RequestSanitizerOptions = Static<typeof RequestSanitizerOptions>;
export const RequestSanitizerOptions = Type.Object({
  secretHeaders: Type.Array(Type.String(), { default: [] }),
  secretRequests: Type.Array(Type.String(), { default: [] }),
  secretResponses: Type.Array(Type.String(), { default: [] }),
});

export type Config = Static<typeof Config>;
export const Config = Type.Object({
  loggers: Type.Array(LoggerConfig),
  sanitizer: RequestSanitizerOptions,
});
