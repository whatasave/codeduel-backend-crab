import type { default as AuthSessionTable } from './AuthSession';
import type { default as TestCaseTable } from './TestCase';
import type { default as ChallengeTable } from './Challenge';
import type { default as UserTable } from './User';
import type { default as GameUserTable } from './GameUser';
import type { default as GameTable } from './Game';
import type { default as AuthTable } from './Auth';

export default interface PublicSchema {
  auth_session: AuthSessionTable;

  test_case: TestCaseTable;

  challenge: ChallengeTable;

  user: UserTable;

  game_user: GameUserTable;

  game: GameTable;

  auth: AuthTable;
}