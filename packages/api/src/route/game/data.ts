import { Type, type Static } from '@sinclair/typebox';
import { Challenge, ChallengeSummary } from '../challenge/data';
import { User, UserListItem } from '../user/data';

export type Mode = Static<typeof Mode>;
export const Mode = Type.Object({
  id: Type.Integer(),
  name: Type.String(),
  description: Type.String(),
});

/** Crab has a single game mode; it is exposed for compatibility with the lobby and frontend. */
export const DEFAULT_MODE: Mode = {
  id: 1,
  name: 'duel',
  description: 'Solve the challenge before the other players',
};

export type Game = Static<typeof Game>;
export const Game = Type.Object({
  id: Type.Integer(),
  /** Id of the lobby the game was played in. */
  uniqueId: Type.String(),
  challenge: ChallengeSummary,
  ownerId: User.properties.id,
  ended: Type.Boolean(),
  mode: Mode,
  maxPlayers: Type.Integer(),
  duration: Type.Integer(),
  allowedLanguages: Type.Array(Type.String()),
  createdAt: Type.String({ format: 'date-time' }),
});

export type UserData = Static<typeof UserData>;
export const UserData = Type.Object({
  user: UserListItem,
  code: Type.Optional(Type.String()),
  language: Type.Optional(Type.String()),
  testsPassed: Type.Integer(),
  submittedAt: Type.Optional(Type.String({ format: 'date-time' })),
  showCode: Type.Boolean(),
});

/** A game with the data of all its players. */
export type GameWithUsersData = Static<typeof GameWithUsersData>;
export const GameWithUsersData = Type.Object({
  game: Game,
  userData: Type.Array(UserData),
});

/** A game with the data of a single player. */
export type GameWithUserData = Static<typeof GameWithUserData>;
export const GameWithUserData = Type.Object({
  game: Game,
  userData: UserData,
});

export type CreateGame = Static<typeof CreateGame>;
export const CreateGame = Type.Object({
  uniqueId: Game.properties.uniqueId,
  challengeId: Type.Optional(Challenge.properties.id),
  ownerId: User.properties.id,
  ended: Type.Optional(Type.Boolean()),
  modeId: Type.Optional(Mode.properties.id),
  maxPlayers: Game.properties.maxPlayers,
  gameDuration: Game.properties.duration,
  /** The lobby sends the languages joined by commas. */
  allowedLanguages: Type.Union([Type.String(), Type.Array(Type.String())]),
  users: Type.Array(User.properties.id, { minItems: 1 }),
});

export type UpdateSubmission = Static<typeof UpdateSubmission>;
export const UpdateSubmission = Type.Object({
  userId: User.properties.id,
  /** Ignored: the game is identified by the path. */
  gameId: Type.Optional(Type.Union([Type.String(), Type.Integer()])),
  code: Type.String(),
  language: Type.String(),
  testsPassed: Type.Integer({ minimum: 0 }),
  /** Ignored: the submission time is set by the server. */
  submittedAt: Type.Optional(Type.String()),
});

export type ShareCodeRequest = Static<typeof ShareCodeRequest>;
export const ShareCodeRequest = Type.Object({
  /** Numeric id or unique id of the game. */
  lobbyId: Type.Union([Game.properties.id, Game.properties.uniqueId]),
  showCode: Type.Boolean(),
});

/** Game reference: numeric id or unique (lobby) id. */
export type GameRef = Game['id'] | Game['uniqueId'];
