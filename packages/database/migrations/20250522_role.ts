import { sql, type Kysely } from 'kysely';
import { updateTimestampTrigger } from './20250421_0_update_timestamp';

export const ROLE_TABLE_NAME = 'role';

const [createTrigger, dropTrigger] = updateTimestampTrigger(ROLE_TABLE_NAME);

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable(ROLE_TABLE_NAME)
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  await db
    .insertInto(ROLE_TABLE_NAME as never)
    .values([{ name: 'owner' }, { name: 'admin' }, { name: 'user' }, { name: 'guest' }])
    .execute();

  await createTrigger(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable(ROLE_TABLE_NAME).ifExists().execute();
  await dropTrigger(db);
}
