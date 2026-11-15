import {
  Kysely,
  PostgresDialect,
  type Selectable,
  type Insertable,
  type Updateable,
  FileMigrationProvider,
  Migrator,
} from 'kysely';
import { Pool, types } from 'pg';
import type DB from './types/Database';
import { Type, type Static } from '@sinclair/typebox';
import { AssertError, Value } from '@sinclair/typebox/value';
import { NO_MIGRATIONS } from 'kysely';
import fs from 'fs/promises';
import path from 'path';

types.setTypeParser(
  types.builtins.TIMESTAMP,
  (value) => `${value.slice(0, 10)}T${value.slice(11)}`
);
types.setTypeParser(
  types.builtins.TIMESTAMPTZ,
  (value) => `${value.slice(0, 10)}T${value.slice(11)}:00`
);

export type Database = Kysely<DB>;

export type Select<T extends keyof DB> = Selectable<DB[T]>;
export type Insert<T extends keyof DB> = Insertable<DB[T]>;
export type Update<T extends keyof DB> = Updateable<DB[T]>;

export { sql } from 'kysely';
export { jsonArrayFrom, jsonObjectFrom } from 'kysely/helpers/postgres';

export type Config = Static<typeof Config>;
export const Config = Type.Object({
  host: Type.String(),
  port: Type.Number({ minimum: 0, maximum: 65535 }),
  database: Type.Optional(Type.String()),
  user: Type.Optional(Type.String()),
  password: Type.Optional(Type.String()),
  ssl: Type.Optional(Type.Boolean()),
  maxConnections: Type.Optional(Type.Number({ minimum: 1, default: 10 })),
});

export interface DatabaseHooks {
  /** Called when a query fails. Only the SQL text is provided, never the bound parameters. */
  onQueryError?: (event: { sql: string; durationMs: number; error: unknown }) => void;
  /** Called after every successful query. */
  onQuery?: (event: { sql: string; durationMs: number }) => void;
  /** Called when an idle client of the connection pool emits an error. */
  onPoolError?: (error: Error) => void;
}

export function createDatabase(
  { host, port, database, user, password, ssl, maxConnections }: Config,
  hooks: DatabaseHooks = {}
): Database {
  const pool = new Pool({
    database,
    host,
    user,
    port,
    password,
    ssl,
    max: maxConnections,
  });
  const { onQuery, onQueryError, onPoolError } = hooks;
  if (onPoolError) pool.on('error', onPoolError);

  const dialect = new PostgresDialect({ pool });
  return new Kysely<DB>({
    dialect,
    log:
      onQuery || onQueryError
        ? (event): void => {
            const sql = event.query.sql;
            const durationMs = Math.round(event.queryDurationMillis);
            if (event.level === 'error') onQueryError?.({ sql, durationMs, error: event.error });
            else onQuery?.({ sql, durationMs });
          }
        : undefined,
  });
}

export function loadConfig(): Config {
  const env = process.env;
  const config = {
    host: env.DATABASE_HOST,
    port: env.DATABASE_PORT,
    database: env.DATABASE_NAME,
    user: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    maxConnections: env.DATABASE_MAX_CONNECTIONS,
  };

  try {
    return Value.Parse(Config, config);
  } catch (error) {
    if (error instanceof AssertError) {
      const errors = Array.from(error.Errors())
        .map((e) => `\t${e.path}: ${e.message}, Received: ${String(e.value)}`)
        .join('\n');
      throw new Error(`Invalid environment:\n${errors}`);
    }
    throw error;
  }
}

export async function migrateToLatest(db: Database): Promise<void> {
  const provider = new FileMigrationProvider({
    fs,
    path,
    migrationFolder: path.join(import.meta.dir, '../migrations'),
  });
  const migrator = new Migrator({ db, provider });
  const { error } = await migrator.migrateToLatest();
  if (error) {
    throw new Error('Migration failed', { cause: error });
  }
}

export async function rollbackMigrations(db: Database): Promise<void> {
  const provider = new FileMigrationProvider({
    fs,
    path,
    migrationFolder: path.join(import.meta.dir, '../migrations'),
  });
  const migrator = new Migrator({ db, provider });
  const { error } = await migrator.migrateTo(NO_MIGRATIONS);
  if (error) {
    throw new Error('Rollback failed', { cause: error });
  }
}

export async function pingDatabase(
  db: Database,
  onError?: (error: unknown) => void
): Promise<boolean> {
  try {
    await db.executeQuery(db.selectNoFrom((eb) => eb.val(1).as('ok')));
    return true;
  } catch (error) {
    onError?.(error);
    return false;
  }
}
