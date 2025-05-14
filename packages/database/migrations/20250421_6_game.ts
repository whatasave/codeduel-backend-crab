import { sql, type Kysely } from 'kysely';
import { updateTimestampTrigger } from './20250421_0_update_timestamp';
import { CHALLENGE_TABLE_NAME } from './20250421_4_challenge';
import { USER_TABLE_NAME } from './20250421_1_user';

export const GAME_TABLE_NAME = 'game';

const [createTrigger, dropTrigger] = updateTimestampTrigger(GAME_TABLE_NAME);

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable(GAME_TABLE_NAME)
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('challenge_id', 'integer', (col) =>
      col.notNull().references(`${CHALLENGE_TABLE_NAME}.id`)
    )
    .addColumn('host_id', 'integer', (col) => col.notNull().references(`${USER_TABLE_NAME}.id`))
    .addColumn('ended_at', 'timestamp')
    .addColumn('max_players', 'integer', (col) => col.notNull())
    .addColumn('duration', 'integer', (col) => col.notNull())
    .addColumn('allowed_languages', 'jsonb', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await createTrigger(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable(GAME_TABLE_NAME).ifExists().execute();
  await dropTrigger(db);
}
