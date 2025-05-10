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
import { NO_MIGRATIONS } from 'kysely';
import fs from 'fs/promises';
import path from 'path';
import type {
  Expression,
  ExpressionBuilder,
  RawBuilder,
  SelectQueryBuilder,
  TableExpression,
} from 'kysely';
import type { ReferenceExpression } from 'kysely';
import { jsonObjectFrom } from 'kysely/helpers/postgres';

export type Database = Kysely<DB>;

type AddPrefix<T, P extends string> = {
  [K in keyof T as K extends string ? `${P}${K}` : never]: T[K];
};

export type Select<T extends keyof DB, Prefix extends string = ''> = AddPrefix<
  Selectable<DB[T]>,
  Prefix
>;
export type Insert<T extends keyof DB, Prefix extends string = ''> = AddPrefix<
  Insertable<DB[T]>,
  Prefix
>;
export type Update<T extends keyof DB, Prefix extends string = ''> = AddPrefix<
  Updateable<DB[T]>,
  Prefix
>;

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

export async function rollbackMigrations(db: Kysely<DB>): Promise<void> {
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

export function populate<
  DB,
  FromTable extends keyof DB,
  TargetTable extends TableExpression<DB, FromTable>,
  T = ReturnType<
    SelectQueryBuilder<
      DB,
      TargetTable extends keyof DB ? TargetTable : never,
      Record<never, never>
    >['selectAll']
  > extends Expression<infer E>
    ? E
    : never,
>(
  eb: ExpressionBuilder<DB, FromTable>,
  table: TargetTable,
  lhs: ReferenceExpression<DB, TargetTable extends keyof DB ? TargetTable : never>,
  rhs: ReferenceExpression<DB, FromTable extends keyof DB ? FromTable : never>,
  cb: (
    eb: SelectQueryBuilder<
      DB,
      TargetTable extends keyof DB ? TargetTable : never,
      Record<never, never>
    >
  ) => Expression<T> = (eb) => eb.selectAll() as Expression<T>
): RawBuilder<T | null> {
  // @ts-expect-error I'm not able to type this correctly
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return jsonObjectFrom(cb(eb.selectFrom(table).whereRef(lhs, '=', rhs)));
}
