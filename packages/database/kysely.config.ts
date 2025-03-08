import { defineConfig } from 'kysely-ctl';
import { database, loadDatabaseOptionsFromEnv } from './src';

export default defineConfig({
  kysely: database(loadDatabaseOptionsFromEnv()),
  migrations: {
    migrationFolder: 'migrations',
  },
  seeds: {
    seedFolder: 'seeds',
  },
});
