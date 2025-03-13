import { defineConfig } from 'kysely-ctl';
import { createDatabase, loadConfig } from './src';

export default defineConfig({
  kysely: createDatabase(loadConfig()),
  migrations: {
    migrationFolder: 'migrations',
  },
  seeds: {
    seedFolder: 'seeds',
  },
});
