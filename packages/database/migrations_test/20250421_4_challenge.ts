import { sql, type Kysely } from 'kysely';
import { USER_TABLE_NAME } from './20250421_1_user.ts';

export const CHALLENGE_TABLE_NAME = 'challenge';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable(CHALLENGE_TABLE_NAME)
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('owner_id', 'integer', (col) => col.notNull().references(`${USER_TABLE_NAME}.id`))
    .addColumn('title', 'varchar(255)', (col) => col.notNull())
    .addColumn('description', 'text', (col) => col.notNull())
    .addColumn('content', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable(CHALLENGE_TABLE_NAME).ifExists().execute();
}
