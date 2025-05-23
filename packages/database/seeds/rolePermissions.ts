import type { Kysely } from 'kysely';
import type DB from '../src/types/Database';

export async function seed(db: Kysely<DB>): Promise<void> {
  const roles = await db
    .insertInto('role')
    .values([{ name: 'owner' }, { name: 'admin' }, { name: 'user' }])
    .returningAll()
    .executeTakeFirstOrThrow();

  const permissions = await db
    .insertInto('permission')
    .values([{ name: 'create' }, { name: 'read' }, { name: 'update' }, { name: 'delete' }])
    .returningAll()
    .executeTakeFirstOrThrow();
}
