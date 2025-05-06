import type { Database, Select } from '@codeduel-backend-crab/database';
import type {
  Challenge,
  ChallengeDetailed,
  CreateChallenge,
  TestCase,
  UpdateChallenge,
} from './data';
import { jsonBuildObject } from 'kysely/helpers/postgres';
import { sql } from 'kysely';

export class ChallengeRepository {
  constructor(private readonly database: Database) {}

  async byId(id: Challenge['id']): Promise<ChallengeDetailed | undefined> {
    const challenge = await this.database
      .selectFrom('challenge')
      .leftJoin('test_case', 'test_case.challenge_id', 'challenge.id')
      .select((eb) => [
        'challenge.id',
        'challenge.owner_id',
        'challenge.title',
        'challenge.description',
        'challenge.content',
        'challenge.created_at',
        'challenge.updated_at',
        eb.fn
          .coalesce(
            eb.fn.jsonAgg(
              jsonBuildObject({
                input: eb.ref('test_case.input').$notNull(),
                output: eb.ref('test_case.output').$notNull(),
              })
            ),
            sql`'[]'::json`
          )
          .as('test_cases'),
      ])
      .where('challenge.id', '=', id)
      .groupBy('challenge.id')
      .executeTakeFirst();
    return challenge && this.selectToChallengeDetailed(challenge);
  }

  async all(): Promise<Challenge[]> {
    const challenges = await this.database.selectFrom('challenge').selectAll().execute();
    return challenges.map(this.selectToChallenge.bind(this));
  }

  async create(challenge: CreateChallenge): Promise<Challenge> {
    const created = await this.database
      .insertInto('challenge')
      .values({
        owner_id: challenge.ownerId,
        title: challenge.title,
        description: challenge.description,
        content: challenge.content,
      })
      .onConflict((oc) => oc.doNothing())
      .returningAll()
      .executeTakeFirstOrThrow();
    return this.selectToChallenge(created);
  }

  async update(challenge: UpdateChallenge): Promise<Challenge | undefined> {
    const updated = await this.database
      .updateTable('challenge')
      .set({
        title: challenge.title,
        description: challenge.description,
        content: challenge.content,
      })
      .where('id', '=', challenge.id)
      .returningAll()
      .executeTakeFirst();
    return updated && this.selectToChallenge(updated);
  }

  async delete(id: Challenge['id']): Promise<boolean> {
    const result = await this.database
      .deleteFrom('challenge')
      .where('id', '=', id)
      .executeTakeFirst();
    return result.numDeletedRows > 0;
  }

  async random(): Promise<ChallengeDetailed | undefined> {
    const challenge = await this.database
      .selectFrom('challenge')
      .leftJoin('test_case', 'test_case.challenge_id', 'challenge.id')
      .select((eb) => [
        'challenge.id',
        'challenge.owner_id',
        'challenge.title',
        'challenge.description',
        'challenge.content',
        'challenge.created_at',
        'challenge.updated_at',
        eb.fn
          .coalesce(
            eb.fn.jsonAgg(
              jsonBuildObject({
                input: eb.ref('test_case.input').$notNull(),
                output: eb.ref('test_case.output').$notNull(),
              })
            ),
            sql`'[]'::json`
          )
          .as('test_cases'),
      ])
      .orderBy(sql`random()`)
      .limit(1)
      .groupBy('challenge.id')
      .executeTakeFirst();
    return challenge && this.selectToChallengeDetailed(challenge);
  }

  private selectToChallengeDetailed(
    challenge: Select<'challenge'> & { test_cases: TestCase[] }
  ): ChallengeDetailed {
    return {
      id: challenge.id,
      ownerId: challenge.owner_id,
      title: challenge.title,
      description: challenge.description,
      content: challenge.content,
      createdAt: challenge.created_at.toISOString(),
      updatedAt: challenge.updated_at.toISOString(),
      testCases: challenge.test_cases,
    };
  }

  private selectToChallenge(challenge: Select<'challenge'>): Challenge {
    return {
      id: challenge.id,
      ownerId: challenge.owner_id,
      title: challenge.title,
      description: challenge.description,
      content: challenge.content,
      createdAt: challenge.created_at.toISOString(),
      updatedAt: challenge.updated_at.toISOString(),
    };
  }
}
