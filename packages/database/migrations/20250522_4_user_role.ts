import { sql, type Kysely } from 'kysely';
import { updateTimestampTrigger } from './20250421_0_update_timestamp';
import { USER_TABLE_NAME } from './20250421_1_user';
import { ROLE_TABLE_NAME } from './20250522_2_role';

export const USER_ROLE_TABLE_NAME = 'user_role';

const [createTrigger, dropTrigger] = updateTimestampTrigger(USER_ROLE_TABLE_NAME);

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable(USER_ROLE_TABLE_NAME)
    .ifNotExists()
    .addColumn('user_id', 'integer', (col) => col.notNull().references(`${USER_TABLE_NAME}.id`))
    .addColumn('role_id', 'integer', (col) => col.notNull().references(`${ROLE_TABLE_NAME}.id`))
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addPrimaryKeyConstraint(`pk_${USER_ROLE_TABLE_NAME}`, ['user_id', 'role_id'])
    .execute();

  await createTrigger(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable(USER_ROLE_TABLE_NAME).ifExists().execute();
  await dropTrigger(db);
}
