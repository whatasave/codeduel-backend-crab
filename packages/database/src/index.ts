import { Kysely, PostgresDialect, type Selectable, type Insertable, type Updateable } from 'kysely';
import { Pool } from 'pg';
import type { DB } from './database';
import { Type, type Static } from '@sinclair/typebox';
import { AssertError, Value } from '@sinclair/typebox/value';

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
