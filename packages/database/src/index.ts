import fs from 'fs/promises';
import path from 'path';
import {
  Kysely,
  PostgresDialect,
  type Selectable,
  type Insertable,
  type Updateable,
  FileMigrationProvider,
  Migrator,
} from 'kysely';
import { Pool } from 'pg';
import type { DB } from './database';
import { Type, type Static } from '@sinclair/typebox';
import { AssertError, Value } from '@sinclair/typebox/value';
import { newDb } from 'pg-mem';

export type Database = Kysely<DB>;

export type Select<T extends keyof DB> = Selectable<DB[T]>;
export type Insert<T extends keyof DB> = Insertable<DB[T]>;
export type Update<T extends keyof DB> = Updateable<DB[T]>;

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

export function createDatabase({
  host,
  port,
  database,
  user,
  password,
  ssl,
  maxConnections,
}: Config): Database {
  const dialect = new PostgresDialect({
    pool: new Pool({
      database,
      host,
      user,
      port,
      password,
      ssl,
      max: maxConnections,
    }),
  });
  return new Kysely<DB>({ dialect });
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

export async function migrateToLatest(db: Kysely<DB>): Promise<void> {
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

export async function runMigrations(db: Kysely<DB>): Promise<void> {
  const migrationsPath = path.join(import.meta.dir, '../migrations');
  const files = await fs.readdir(migrationsPath);
  const migrationFiles = files.filter((f) => f.endsWith('.ts'));

  for (const file of migrationFiles.sort()) {
    const fullPath = path.resolve(migrationsPath, file);
    interface Migration {
      up: (db: Kysely<unknown>) => Promise<void>;
      down?: (db: Kysely<unknown>) => Promise<void>;
    }
    const migration = (await import(fullPath)) as Migration;

    if (typeof migration.up === 'function') {
      await migration.up(db as unknown as Kysely<unknown>);
    } else {
      console.warn(`Skipping ${file}: no 'up' function found.`);
    }
  }
}

export async function createMockDatabase(): Promise<Database> {
  const memDb = newDb({
    autoCreateForeignKeyIndices: true,
  });

  const pg = memDb.adapters.createPg();
  const memPool = pg.Pool as unknown as Pool;

  const db = new Kysely<DB>({
    dialect: new PostgresDialect({
      pool: memPool as unknown as Pool,
    }),
  });

  await runMigrations(db);

  return db as Database;
}
