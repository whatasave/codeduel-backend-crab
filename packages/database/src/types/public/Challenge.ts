import type { UserId } from './User';
import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

export type ChallengeId = number;

/** Represents the table public.challenge */
export default interface ChallengeTable {
  id: ColumnType<ChallengeId, ChallengeId | undefined, ChallengeId>;

  owner_id: ColumnType<UserId, UserId, UserId>;

  title: ColumnType<string, string, string>;

  description: ColumnType<string, string, string>;

  content: ColumnType<string, string, string>;

  created_at: ColumnType<string, string | undefined, string>;

  updated_at: ColumnType<string, string | undefined, string>;
}

export type Challenge = Selectable<ChallengeTable>;

export type NewChallenge = Insertable<ChallengeTable>;

export type ChallengeUpdate = Updateable<ChallengeTable>;