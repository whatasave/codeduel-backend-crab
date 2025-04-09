import { sql, type Kysely } from 'kysely';
import {
  createUpdateTimestampTrigger,
  dropUpdateTimestampTrigger,
} from './20250406_update_timestamp';

export const USER_TABLE_NAME = 'user';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable(USER_TABLE_NAME)
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('username', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('name', 'varchar(255)')
    .addColumn('avatar', 'varchar(255)')
    .addColumn('background_image', 'varchar(255)')
    .addColumn('biography', 'text')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await createUpdateTimestampTrigger(db, USER_TABLE_NAME);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable(USER_TABLE_NAME).ifExists().execute();
  await dropUpdateTimestampTrigger(db, USER_TABLE_NAME);
}
