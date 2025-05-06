import {
  createDatabase,
  loadConfig,
  migrateToLatest,
  rollbackMigrations,
  type Database,
} from '@codeduel-backend-crab/database';

export function createTestDatabase(): Database {
  return createDatabase(loadConfig());
}

export async function setupTestDatabase(): Promise<Database> {
  const db = createTestDatabase();
  await rollbackMigrations(db);
  await migrateToLatest(db);
  return db;
}
