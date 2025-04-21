import { sql, type Kysely } from 'kysely';
import { TABLE, updateTimestampTrigger } from '../utils.ts';

const [createTrigger, dropTrigger] = updateTimestampTrigger(TABLE.AUTH);

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable(TABLE.AUTH)
    .ifNotExists()
    .addColumn('user_id', 'serial', (col) => col.notNull().references(`${TABLE.USER}.id`))
    .addColumn('provider', 'varchar(255)', (col) => col.notNull())
    .addColumn('provider_id', 'serial', (col) => col.notNull().unique())
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  await createTrigger().execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable(TABLE.AUTH).ifExists().execute();
  await dropTrigger().execute(db);
}
