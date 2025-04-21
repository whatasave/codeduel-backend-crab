import type { Kysely } from 'kysely';
import { TABLE } from '../utils';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable(TABLE.TEST_CASE)
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('challenge_id', 'integer', (col) =>
      col.notNull().references(`${TABLE.CHALLENGE}.id`)
    )
    .addColumn('input', 'text', (col) => col.notNull())
    .addColumn('output', 'text', (col) => col.notNull())
    .addColumn('hidden', 'boolean', (col) => col.notNull())
    .addUniqueConstraint('uq_test_case_challenge_id_input', ['challenge_id', 'input'])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable(TABLE.TEST_CASE).ifExists().execute();
}
