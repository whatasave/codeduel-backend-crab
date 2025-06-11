import { sql, type Kysely } from 'kysely';
import { updateTimestampTrigger } from './20250421_0_update_timestamp';
import { ROLE_TABLE_NAME } from './20250522_2_role';
import { PERMISSION_TABLE_NAME } from './20250522_1_permission';

export const ROLE_PERMISSION_TABLE_NAME = 'role_permission';

const [createTrigger, dropTrigger] = updateTimestampTrigger(ROLE_PERMISSION_TABLE_NAME);

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable(ROLE_PERMISSION_TABLE_NAME)
    .ifNotExists()
    .addColumn('role_id', 'integer', (col) => col.notNull().references(`${ROLE_TABLE_NAME}.id`))
    .addColumn('permission_id', 'integer', (col) =>
      col.notNull().references(`${PERMISSION_TABLE_NAME}.id`)
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addPrimaryKeyConstraint(`pk_${ROLE_PERMISSION_TABLE_NAME}`, ['role_id', 'permission_id'])
    .execute();

  await createTrigger(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable(ROLE_PERMISSION_TABLE_NAME).ifExists().execute();
  await dropTrigger(db);
}
