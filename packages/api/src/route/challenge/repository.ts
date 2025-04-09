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

  async findById(id: Challenge['id']): Promise<ChallengeDetailed | undefined> {
    const challenge = await this.database
      .selectFrom('challenge')
      .innerJoin('test_case', 'test_case.challenge_id', 'challenge.id')
      .select((eb) => [
        'challenge.id',
        'challenge.owner_id',
        'challenge.title',
        'challenge.description',
        'challenge.content',
        'challenge.created_at',
        'challenge.updated_at',
        eb.fn
          .jsonAgg(
            jsonBuildObject({
              input: eb.ref('test_case.input'),
              output: eb.ref('test_case.output'),
            })
          )
          .as('test_cases'),
      ])
      .where('challenge.id', '=', id)
      .groupBy('challenge.id')
      .executeTakeFirst();
    return challenge && this.selectToChallengeDetailed(challenge);
  }

  async findAll(): Promise<Challenge[]> {
    const challenges = await this.database.selectFrom('challenge').selectAll().execute();
    return challenges.map(this.selectToChallenge.bind(this));
  }

  async create(challenge: CreateChallenge): Promise<Challenge | undefined> {
    const [createdChallenge] = await this.database
      .insertInto('challenge')
      .values({
        owner_id: challenge.ownerId,
        title: challenge.title,
        description: challenge.description,
        content: challenge.content,
      })
      .returningAll()
      .execute();
    return createdChallenge && this.selectToChallenge(createdChallenge);
  }

  async update(challenge: UpdateChallenge): Promise<Challenge | undefined> {
    const [updatedChallenge] = await this.database
      .updateTable('challenge')
      .set({
        title: challenge.title,
        description: challenge.description,
        content: challenge.content,
      })
      .where('id', '=', challenge.id)
      .returningAll()
      .execute();
    return updatedChallenge && this.selectToChallenge(updatedChallenge);
  }

  async delete(id: Challenge['id']): Promise<boolean> {
    const result = await this.database
      .deleteFrom('challenge')
      .where('id', '=', id)
      .executeTakeFirst();
    return result.numDeletedRows > 0;
  }

  async findRandom(): Promise<ChallengeDetailed | undefined> {
    const challenge = await this.database
      .selectFrom('challenge')
      .innerJoin('test_case', 'test_case.challenge_id', 'challenge.id')
      .select((eb) => [
        'challenge.id',
        'challenge.owner_id',
        'challenge.title',
        'challenge.description',
        'challenge.content',
        'challenge.created_at',
        'challenge.updated_at',
        eb.fn
          .jsonAgg(
            jsonBuildObject({
              input: eb.ref('test_case.input'),
              output: eb.ref('test_case.output'),
            })
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
