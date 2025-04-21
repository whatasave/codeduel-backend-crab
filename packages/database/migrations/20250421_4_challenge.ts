import { sql, type Kysely } from 'kysely';
import { TABLE, updateTimestampTrigger } from '../utils.ts';

const [createTrigger, dropTrigger] = updateTimestampTrigger(TABLE.CHALLENGE);

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable(TABLE.CHALLENGE)
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('owner_id', 'integer', (col) => col.notNull().references(`${TABLE.USER}.id`))
    .addColumn('title', 'varchar(255)', (col) => col.notNull())
    .addColumn('description', 'text', (col) => col.notNull())
    .addColumn('content', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await createTrigger().execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable(TABLE.CHALLENGE).ifExists().execute();
  await dropTrigger().execute(db);
}
