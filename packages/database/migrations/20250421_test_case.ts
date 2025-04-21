import type { Kysely } from 'kysely';
import { CHALLENGE_TABLE_NAME } from './20250421_challenge';

export const TEST_CASE_TABLE_NAME = 'test_case';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable(TEST_CASE_TABLE_NAME)
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('challenge_id', 'integer', (col) =>
      col.notNull().references(`${CHALLENGE_TABLE_NAME}.id`)
    )
    .addColumn('input', 'text', (col) => col.notNull())
    .addColumn('output', 'text', (col) => col.notNull())
    .addColumn('hidden', 'boolean', (col) => col.notNull())
    .addUniqueConstraint('uq_test_case_challenge_id_input', ['challenge_id', 'input'])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable(TEST_CASE_TABLE_NAME).ifExists().execute();
}
