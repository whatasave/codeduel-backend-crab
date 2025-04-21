import { sql, type RawBuilder } from 'kysely';

export function updateTimestampTrigger(
  tableName: string
): [() => RawBuilder<unknown>, () => RawBuilder<unknown>] {
  return [
    () => createUpdateTimestampTrigger(tableName),
    () => dropUpdateTimestampTrigger(tableName),
  ];
}

function createUpdateTimestampTrigger(tableName: string): RawBuilder<unknown> {
  return sql`
    CREATE TRIGGER update_${tableName}_timestamp
    BEFORE UPDATE ON ${sql.table(tableName)}
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();
  `;
}

function dropUpdateTimestampTrigger(tableName: string): RawBuilder<unknown> {
  return sql`DROP TRIGGER IF EXISTS update_${tableName}_timestamp ON ${sql.table(tableName)};`;
}

export const TABLE = {
  USER: 'user',
  AUTH: 'auth',
  CHALLENGE: 'challenge',
  TEST_CASE: 'test_case',
} as const;
