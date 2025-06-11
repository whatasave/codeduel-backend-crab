import { sql, type Kysely } from 'kysely';
import { updateTimestampTrigger } from './20250421_0_update_timestamp';
import { USER_TABLE_NAME } from './20250421_1_user';
import { PERMISSION_TABLE_NAME } from './20250522_1_permission';

export const USER_PERMISSION_TABLE_NAME = 'user_permission';

const [createTrigger, dropTrigger] = updateTimestampTrigger(USER_PERMISSION_TABLE_NAME);

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable(USER_PERMISSION_TABLE_NAME)
    .ifNotExists()
    .addColumn('user_id', 'integer', (col) => col.notNull().references(`${USER_TABLE_NAME}.id`))
    .addColumn('permission_id', 'integer', (col) =>
      col.notNull().references(`${PERMISSION_TABLE_NAME}.id`)
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addPrimaryKeyConstraint(`pk_${USER_PERMISSION_TABLE_NAME}`, ['user_id', 'permission_id'])
    .execute();

  await createTrigger(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable(USER_PERMISSION_TABLE_NAME).ifExists().execute();
  await dropTrigger(db);
}
