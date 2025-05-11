import { Type, type Static } from '@sinclair/typebox';
import { GameChallenge } from '../challenge/data';
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
  challengeId: Type.Optional(Type.Number()),
  hostId: Type.Number(),
  maxPlayers: Type.Number(),
  duration: Type.Number(),
  allowedLanguages: Type.Array(Type.String()),
  userIds: Type.Array(User.properties.id),
});

export type UpdateGameUser = Static<typeof UpdateGameUser>;
export const UpdateGameUser = Type.Object({
  gameId: Type.Number(),
  userId: Type.Number(),
  code: Type.String(),
  language: Type.String(),
  testsPassed: Type.Number(),
  submittedAt: Type.String({ format: 'date-time' }),
});

export type ShareCode = Static<typeof ShareCode>;
export const ShareCode = Type.Object({
  gameId: Type.Number(),
  userId: Type.Number(),
  showCode: Type.Boolean(),
});

export type GameUser = Static<typeof GameUser>;
export const GameUser = Type.Object({
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
