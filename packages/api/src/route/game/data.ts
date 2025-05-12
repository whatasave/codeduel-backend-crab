import { Type, type Static } from '@sinclair/typebox';
import { Challenge, GameChallenge } from '../challenge/data';
import { User } from '../user/data';

export type Game = Static<typeof Game>;
export const Game = Type.Object({
  id: Type.Number(),
  challenge: GameChallenge,
  host: User,
  endedAt: Type.Optional(Type.String({ format: 'date-time' })),
  maxPlayers: Type.Number(),
  duration: Type.Number(),
  allowedLanguages: Type.Array(Type.String()),
});

export type CreateGame = Static<typeof CreateGame>;
export const CreateGame = Type.Object({
  challengeId: Type.Optional(Challenge.properties.id),
  hostId: User.properties.id,
  maxPlayers: Type.Number(),
  duration: Type.Number(),
  allowedLanguages: Type.Array(Type.String(), { minItems: 1 }),
  userIds: Type.Array(User.properties.id, { minItems: 1 }),
});

export type UpdateGameUser = Static<typeof UpdateGameUser>;
export const UpdateGameUser = Type.Object({
  gameId: Game.properties.id,
  userId: User.properties.id,
  code: Type.String(),
  language: Type.String(),
  testsPassed: Type.Number(),
  submittedAt: Type.String({ format: 'date-time' }),
});

export type ShareCode = Static<typeof ShareCode>;
export const ShareCode = Type.Object({
  gameId: Game.properties.id,
  userId: User.properties.id,
  showCode: Type.Boolean(),
});

export type GameUser = Static<typeof GameUser>;
export const GameUser = Type.Object({
  userId: User.properties.id,
  code: Type.Optional(Type.String()),
  language: Type.Optional(Type.String()),
  testsPassed: Type.Number(),
  showCode: Type.Boolean(),
  submittedAt: Type.Optional(Type.String({ format: 'date-time' })),
});

export type GameOfUser = Static<typeof GameOfUser>;
export const GameOfUser = Type.Object({
  user: GameUser,
  game: Game,
});

export type GameWithUserData = Static<typeof GameWithUserData>;
export const GameWithUserData = Type.Object({
  game: Game,
  users: Type.Array(GameUser),
});
