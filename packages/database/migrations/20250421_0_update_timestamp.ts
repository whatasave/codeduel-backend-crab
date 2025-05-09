import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
      CREATE OR REPLACE FUNCTION update_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP FUNCTION IF EXISTS update_timestamp()`.execute(db);
}

export function updateTimestampTrigger(tableName: string): [typeof up, typeof down] {
  const triggerName = `update_${tableName}_timestamp`;

  return [
    (db) => createUpdateTimestampTrigger(db, triggerName, tableName),
    (db) => dropUpdateTimestampTrigger(db, triggerName, tableName),
  ];
}

async function createUpdateTimestampTrigger(
  db: Kysely<unknown>,
  triggerName: string,
  tableName: string
): Promise<void> {
  await sql`
    CREATE TRIGGER ${sql.raw(triggerName)}
    BEFORE UPDATE ON ${sql.table(tableName)}
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp()
  `.execute(db);
}

async function dropUpdateTimestampTrigger(
  db: Kysely<unknown>,
  triggerName: string,
  tableName: string
): Promise<void> {
  await sql`DROP TRIGGER IF EXISTS ${sql.raw(triggerName)} ON ${sql.table(tableName)}`.execute(db);
}
