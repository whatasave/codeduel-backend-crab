import type { ChallengeId } from './Challenge';
import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

export type TestCaseId = number;

/** Represents the table public.test_case */
export default interface TestCaseTable {
  id: ColumnType<TestCaseId, TestCaseId | undefined, TestCaseId>;

  challenge_id: ColumnType<ChallengeId, ChallengeId, ChallengeId>;

  input: ColumnType<string, string, string>;

  output: ColumnType<string, string, string>;

  hidden: ColumnType<boolean, boolean, boolean>;
}

export type TestCase = Selectable<TestCaseTable>;

export type NewTestCase = Insertable<TestCaseTable>;

export type TestCaseUpdate = Updateable<TestCaseTable>;