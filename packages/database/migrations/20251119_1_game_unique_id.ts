import { sql, type Kysely } from 'kysely';
import { GAME_TABLE_NAME } from './20250421_6_game';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable(GAME_TABLE_NAME)
    .addColumn('unique_id', 'varchar(255)', (col) =>
      col
        .notNull()
        .unique()
        .defaultTo(sql`gen_random_uuid()::text`)
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable(GAME_TABLE_NAME).dropColumn('unique_id').execute();
}
