import { Type, type Static } from '@sinclair/typebox';
import { ChallengeDetailed } from '../challenge/data';
import { User } from '../user/data';

export type Game = Static<typeof Game>;
export const Game = Type.Object({
  id: Type.Number(),
  challenge: ChallengeDetailed,
  host: User,
  endedAt: Type.Optional(Type.String({ format: 'date-time' })),
  maxPlayers: Type.Number(),
  duration: Type.Number(),
  allowedLanguages: Type.Array(Type.String()),
});
