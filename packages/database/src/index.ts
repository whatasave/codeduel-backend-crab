import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { DB } from './database';

export type Database = Kysely<DB>;

export interface DatabaseOptions {
  host: string;
  port: number;
  database?: string;
  user?: string;
  password?: string;
  max?: number;
}

export function database({ host, port, database, user, password, max }: DatabaseOptions): Database {
  const dialect = new PostgresDialect({
    pool: new Pool({
      database,
      host,
      user,
      port,
      password,
      max,
    }),
  });
  return new Kysely<DB>({ dialect });
}

export function loadDatabaseOptionsFromEnv(): DatabaseOptions {
  return {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5432'),
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    max: parseInt(process.env.DATABASE_POOL_SIZE ?? '10'),
  };
}
