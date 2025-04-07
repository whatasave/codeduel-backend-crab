import { sql, type Kysely } from 'kysely';
import * as user from './tables/user';
import * as auth from './tables/auth';

export async function up(db: Kysely<unknown>): Promise<void> {
  await user.up(db);
  await auth.up(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await auth.down(db);
  await user.down(db);
}
