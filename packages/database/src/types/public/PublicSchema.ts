import type { default as UserRoleTable } from './UserRole';
import type { default as AuthSessionTable } from './AuthSession';
import type { default as TestCaseTable } from './TestCase';
import type { default as ChallengeTable } from './Challenge';
import type { default as UserTable } from './User';
import type { default as UserPermissionTable } from './UserPermission';
import type { default as GameUserTable } from './GameUser';
import type { default as GameTable } from './Game';
import type { default as RolePermissionTable } from './RolePermission';
import type { default as AuthTable } from './Auth';
import type { default as RoleTable } from './Role';
import type { default as PermissionTable } from './Permission';

export default interface PublicSchema {
  user_role: UserRoleTable;

  auth_session: AuthSessionTable;

  test_case: TestCaseTable;

  challenge: ChallengeTable;

  user: UserTable;

  user_permission: UserPermissionTable;

  game_user: GameUserTable;

  game: GameTable;

  role_permission: RolePermissionTable;

  auth: AuthTable;

  role: RoleTable;

  permission: PermissionTable;
}