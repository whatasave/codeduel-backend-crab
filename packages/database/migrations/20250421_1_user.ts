import { sql, type Kysely } from 'kysely';
import { TABLE, updateTimestampTrigger } from '../utils.ts';

const [createTrigger, dropTrigger] = updateTimestampTrigger(TABLE.USER);

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable(TABLE.USER)
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

  await createTrigger().execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable(TABLE.USER).ifExists().execute();
  await dropTrigger().execute(db);
}
