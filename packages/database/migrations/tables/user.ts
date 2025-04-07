import { sql, type Kysely } from 'kysely';

export const TABLE_NAME = 'user';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable(TABLE_NAME)
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('username', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('name', 'varchar(255)')
    .addColumn('avatar', 'varchar(255)')
    .addColumn('background_image', 'varchar(255)')
    .addColumn('biography', 'text')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  await sql`
    CREATE OR REPLACE FUNCTION update_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `.execute(db);

  await sql`
    DROP TRIGGER IF EXISTS ${TABLE_NAME}_update_timestamp ON ${sql.table(TABLE_NAME)};
    CREATE TRIGGER ${TABLE_NAME}_update_timestamp
    BEFORE UPDATE ON ${sql.table(TABLE_NAME)}
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable(TABLE_NAME).ifExists().execute();
  await sql`DROP TRIGGER IF EXISTS ${TABLE_NAME}_update_timestamp ON ${sql.table(TABLE_NAME)};`.execute(
    db
  );
  await sql`DROP FUNCTION IF EXISTS update_timestamp();`.execute(db);
}
