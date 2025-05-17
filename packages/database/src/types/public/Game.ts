import type { ChallengeId } from './Challenge';
import type { UserId } from './User';
import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

export type GameId = number;

/** Represents the table public.game */
export default interface GameTable {
  id: ColumnType<GameId, GameId | undefined, GameId>;

  challenge_id: ColumnType<ChallengeId, ChallengeId, ChallengeId>;

  host_id: ColumnType<UserId, UserId, UserId>;

  ended_at: ColumnType<string | null, string | null, string | null>;

  max_players: ColumnType<number, number, number>;

  duration: ColumnType<number, number, number>;

  allowed_languages: ColumnType<unknown, unknown, unknown>;

  created_at: ColumnType<string, string | undefined, string>;

  updated_at: ColumnType<string, string | undefined, string>;
}

export type Game = Selectable<GameTable>;

export type NewGame = Insertable<GameTable>;

export type GameUpdate = Updateable<GameTable>;