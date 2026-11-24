import { sql, type Kysely } from 'kysely';

import { AUTH_SESSION_TABLE_NAME } from './20250421_3_auth_session';

export const AUTH_USED_REFRESH_TOKEN_TABLE_NAME = 'auth_used_refresh_token';

const SESSION_TOKEN_ID_INDEX = `${AUTH_SESSION_TABLE_NAME}_token_id_unique`;
const SESSION_EXPIRES_AT_INDEX = `${AUTH_SESSION_TABLE_NAME}_expires_at_index`;
const USED_SESSION_ID_INDEX = `${AUTH_USED_REFRESH_TOKEN_TABLE_NAME}_session_id_index`;
const USED_EXPIRES_AT_INDEX = `${AUTH_USED_REFRESH_TOKEN_TABLE_NAME}_expires_at_index`;

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable(AUTH_SESSION_TABLE_NAME)
    .addColumn('expires_at', 'timestamptz')
    .execute();

  await db.schema
    .createIndex(SESSION_TOKEN_ID_INDEX)
    .on(AUTH_SESSION_TABLE_NAME)
    .column('token_id')
    .unique()
    .execute();

  await db.schema
    .createIndex(SESSION_EXPIRES_AT_INDEX)
    .on(AUTH_SESSION_TABLE_NAME)
    .column('expires_at')
    .execute();

  await db.schema
    .createTable(AUTH_USED_REFRESH_TOKEN_TABLE_NAME)
    .ifNotExists()
    .addColumn('token_id', 'varchar(255)', (col) => col.primaryKey())
    .addColumn('session_id', 'integer', (col) =>
      col.notNull().references(`${AUTH_SESSION_TABLE_NAME}.id`).onDelete('cascade')
    )
    .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
    .addColumn('used_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await db.schema
    .createIndex(USED_SESSION_ID_INDEX)
    .on(AUTH_USED_REFRESH_TOKEN_TABLE_NAME)
    .column('session_id')
    .execute();

  await db.schema
    .createIndex(USED_EXPIRES_AT_INDEX)
    .on(AUTH_USED_REFRESH_TOKEN_TABLE_NAME)
    .column('expires_at')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable(AUTH_USED_REFRESH_TOKEN_TABLE_NAME).ifExists().execute();
  await db.schema.dropIndex(SESSION_EXPIRES_AT_INDEX).ifExists().execute();
  await db.schema.dropIndex(SESSION_TOKEN_ID_INDEX).ifExists().execute();
  await db.schema.alterTable(AUTH_SESSION_TABLE_NAME).dropColumn('expires_at').execute();
}
