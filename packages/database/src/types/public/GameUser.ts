import type { GameId } from './Game';
import type { UserId } from './User';
import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

/** Represents the table public.game_user */
export default interface GameUserTable {
  game_id: ColumnType<GameId, GameId, GameId>;

  user_id: ColumnType<UserId, UserId, UserId>;

  code: ColumnType<string | null, string | null, string | null>;

  language: ColumnType<string | null, string | null, string | null>;

  tests_passed: ColumnType<number, number | undefined, number>;

  show_code: ColumnType<boolean, boolean | undefined, boolean>;

  submitted_at: ColumnType<string | null, string | null, string | null>;
}

export type GameUser = Selectable<GameUserTable>;

export type NewGameUser = Insertable<GameUserTable>;

export type GameUserUpdate = Updateable<GameUserTable>;