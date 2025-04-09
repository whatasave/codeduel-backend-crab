import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
      CREATE OR REPLACE FUNCTION update_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP FUNCTION IF EXISTS update_timestamp();`.execute(db);
}

export async function createUpdateTimestampTrigger(
  db: Kysely<unknown>,
  tableName: string
): Promise<void> {
  await sql`
      DROP TRIGGER IF EXISTS update_user_timestamp ON ${sql.table(tableName)};
      CREATE TRIGGER update_user_timestamp
      BEFORE UPDATE ON ${sql.table(tableName)}
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    `.execute(db);
}

export async function dropUpdateTimestampTrigger(
  db: Kysely<unknown>,
  tableName: string
): Promise<void> {
  await sql`DROP TRIGGER IF EXISTS update_user_timestamp ON ${sql.table(tableName)};`.execute(db);
}
