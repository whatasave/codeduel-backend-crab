import type { Kysely } from 'kysely';
import type DB from '../src/types/Database';

export async function seed(db: Kysely<DB>): Promise<void> {
  const [owner, admin, user] = await db
    .insertInto('role')
    .values([{ name: 'owner' }, { name: 'admin' }, { name: 'user' }])
    .returningAll()
    .execute();

  const [login] = await db
    .insertInto('permission')
    .values([{ name: 'login' }])
    .returningAll()
    .execute();

  if (!owner || !admin || !user || !login) throw new Error('Failed to create roles or permissions');

  await db
    .insertInto('role_permission')
    .values([
      { role_id: owner.id, permission_id: login.id },
      { role_id: admin.id, permission_id: login.id },
      { role_id: user.id, permission_id: login.id },
    ])
    .executeTakeFirstOrThrow();
}
