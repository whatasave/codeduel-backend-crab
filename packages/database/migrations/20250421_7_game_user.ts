import type { Kysely } from 'kysely';
import { USER_TABLE_NAME } from './20250421_1_user';
import { GAME_TABLE_NAME } from './20250421_6_game';

export const GAME_USER_TABLE_NAME = 'game_user';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable(GAME_USER_TABLE_NAME)
    .ifNotExists()
    .addColumn('game_id', 'integer', (col) => col.notNull().references(`${GAME_TABLE_NAME}.id`))
    .addColumn('user_id', 'integer', (col) => col.notNull().references(`${USER_TABLE_NAME}.id`))
    .addColumn('code', 'text')
    .addColumn('language', 'varchar(64)')
    .addColumn('tests_passed', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('submitted_at', 'timestamp')
    .addPrimaryKeyConstraint('pk_game_user', ['game_id', 'user_id'])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable(GAME_USER_TABLE_NAME).ifExists().execute();
}
