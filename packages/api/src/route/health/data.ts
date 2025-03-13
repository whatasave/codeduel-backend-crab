import { Type, type Static } from '@sinclair/typebox';

export type LivenessStatus = Static<typeof LivenessStatus>;
export const LivenessStatus = Type.Union([Type.Literal('ok')]);

export type ReadinessStatus = Static<typeof ReadinessStatus>;
export const ReadinessStatus = Type.Union([
  Type.Literal('ready'),
  Type.Literal('not_ready'),
  Type.Literal('game_server_offline'),
]);
