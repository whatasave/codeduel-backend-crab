import { sql, type Kysely } from 'kysely';
import { USER_TABLE_NAME } from './20250421_1_user.ts';
import { updateTimestampTrigger } from './20250421_0_update_timestamp.ts';

export const CHALLENGE_TABLE_NAME = 'challenge';

const [createTrigger, dropTrigger] = updateTimestampTrigger(CHALLENGE_TABLE_NAME);

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable(CHALLENGE_TABLE_NAME)
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('owner_id', 'integer', (col) => col.notNull().references(`${USER_TABLE_NAME}.id`))
    .addColumn('title', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('description', 'text', (col) => col.notNull())
    .addColumn('content', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await createTrigger(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable(CHALLENGE_TABLE_NAME).ifExists().execute();
  await dropTrigger(db);
}
