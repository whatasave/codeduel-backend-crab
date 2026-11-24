import type { Kysely } from 'kysely';

import { AUTH_SESSION_TABLE_NAME } from './20250421_3_auth_session';

const SESSION_TOKEN_ID_INDEX = `${AUTH_SESSION_TABLE_NAME}_token_id_unique`;
const SESSION_EXPIRES_AT_INDEX = `${AUTH_SESSION_TABLE_NAME}_expires_at_index`;

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
    .where('token_id', 'is not', null)
    .execute();

  await db.schema
    .createIndex(SESSION_EXPIRES_AT_INDEX)
    .on(AUTH_SESSION_TABLE_NAME)
    .column('expires_at')
    .where('expires_at', 'is not', null)
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex(SESSION_EXPIRES_AT_INDEX).ifExists().execute();
  await db.schema.dropIndex(SESSION_TOKEN_ID_INDEX).ifExists().execute();
  await db.schema.alterTable(AUTH_SESSION_TABLE_NAME).dropColumn('expires_at').execute();
}
