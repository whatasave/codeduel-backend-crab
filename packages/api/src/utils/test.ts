import {
  createDatabase,
  loadConfig,
  migrateToLatest,
  type Database,
} from '@codeduel-backend-crab/database';

export function createTestDatabase(): Database {
  return createDatabase(loadConfig());
}

export async function setupTestDatabase(): Promise<Database> {
  const db = createTestDatabase();
  await db.schema.dropSchema('public').ifExists().cascade().execute();
  await db.schema.createSchema('public').execute();
  await migrateToLatest(db);
  return db;
}
