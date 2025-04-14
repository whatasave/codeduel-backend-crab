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

export function updateTimestampTrigger(tableName: string): [typeof up, typeof down] {
  return [
    (db: Kysely<unknown>) => createUpdateTimestampTrigger(db, tableName),
    (db: Kysely<unknown>) => dropUpdateTimestampTrigger(db, tableName),
  ];
}

async function createUpdateTimestampTrigger(db: Kysely<unknown>, tableName: string): Promise<void> {
  await sql`
      DROP TRIGGER IF EXISTS update_${sql.table(tableName)}_timestamp ON ${sql.table(tableName)};
      CREATE TRIGGER update_${sql.table(tableName)}_timestamp
      BEFORE UPDATE ON ${sql.table(tableName)}
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    `.execute(db);
}

async function dropUpdateTimestampTrigger(db: Kysely<unknown>, tableName: string): Promise<void> {
  await sql`DROP TRIGGER IF EXISTS update_${sql.table(tableName)}_timestamp ON ${sql.table(tableName)};`.execute(
    db
  );
}
