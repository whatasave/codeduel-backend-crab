import { sql, type Kysely } from 'kysely';
import { updateTimestampTrigger } from './20250421_0_update_timestamp';
import { USER_TABLE_NAME } from './20250421_1_user';

export const AUTH_SESSION_TABLE_NAME = 'auth_session';

const [createTrigger, dropTrigger] = updateTimestampTrigger(AUTH_SESSION_TABLE_NAME);

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable(AUTH_SESSION_TABLE_NAME)
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('user_id', 'serial', (col) => col.notNull().references(`${USER_TABLE_NAME}.id`))
    .addColumn('token_id', 'varchar(255)')
    .addColumn('ip', 'varchar(255)')
    .addColumn('user_agent', 'varchar(255)')
    .addColumn('provider', 'varchar(255)', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  await createTrigger(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable(AUTH_SESSION_TABLE_NAME).ifExists().execute();
  await dropTrigger(db);
}
