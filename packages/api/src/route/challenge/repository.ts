import {
  jsonArrayFrom,
  jsonObjectFrom,
  type Database,
  type Select,
} from '@codeduel-backend-crab/database';
import type {
  ChallengeWithUser,
  ChallengeWithUserAndTestCases,
  CreateChallenge,
  TestCase,
  UpdateChallenge,
  Challenge,
} from './data';
import { sql } from 'kysely';
import { UserRepository } from '../user/repository';

export class ChallengeRepository {
  constructor(private readonly database: Database) {}

  async byId(id: ChallengeWithUser['id']): Promise<ChallengeWithUserAndTestCases | undefined> {
    const challenge = await this.database
      .selectFrom('challenge')
      .where('id', '=', id)
      .selectAll()
      .select((eb) =>
        jsonObjectFrom(eb.selectFrom('user').whereRef('id', '=', 'owner_id').selectAll())
          .$notNull()
          .as('owner')
      )
      .select((eb) =>
        jsonArrayFrom(
          eb.selectFrom('test_case').whereRef('challenge_id', '=', 'id').selectAll()
        ).as('test_cases')
      )
      .executeTakeFirst();
    return challenge && ChallengeRepository.selectToGameChallenge(challenge);
  }

  async all(): Promise<ChallengeWithUser[]> {
    const challenges = await this.database
      .selectFrom('challenge')
      .selectAll()
      .select((eb) =>
        jsonObjectFrom(eb.selectFrom('user').whereRef('id', '=', 'owner_id').selectAll())
          .$notNull()
          .as('owner')
      )
      .select((eb) =>
        jsonArrayFrom(
          eb.selectFrom('test_case').whereRef('challenge_id', '=', 'id').selectAll()
        ).as('test_cases')
      )
      .execute();
    return challenges.map((challenge) => ChallengeRepository.selectToChallengeDetailed(challenge));
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
      .returningAll()
      .executeTakeFirstOrThrow();
    return ChallengeRepository.selectToChallenge(created);
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
    return updated && ChallengeRepository.selectToChallenge(updated);
  }

  async delete(id: ChallengeWithUser['id']): Promise<boolean> {
    const result = await this.database
      .deleteFrom('challenge')
      .where('id', '=', id)
      .executeTakeFirst();
    return result.numDeletedRows > 0;
  }

  async random(): Promise<ChallengeWithUserAndTestCases | undefined> {
    const challenge = await this.database
      .selectFrom('challenge')
      .orderBy(sql`RANDOM()`)
      .limit(1)
      .selectAll()
      .select((eb) =>
        jsonObjectFrom(eb.selectFrom('user').whereRef('id', '=', 'owner_id').selectAll())
          .$notNull()
          .as('owner')
      )
      .select((eb) =>
        jsonArrayFrom(
          eb.selectFrom('test_case').whereRef('challenge_id', '=', 'id').selectAll()
        ).as('test_cases')
      )
      .executeTakeFirst();
    return challenge && ChallengeRepository.selectToGameChallenge(challenge);
  }

  static selectToGameChallenge(
    challenge: Select<'challenge'> & { owner: Select<'user'> } & { test_cases: TestCase[] }
  ): ChallengeWithUserAndTestCases {
    return {
      id: challenge.id,
      owner: UserRepository.selectToUser(challenge.owner),
      title: challenge.title,
      description: challenge.description,
      content: challenge.content,
      createdAt: challenge.created_at.toISOString(),
      updatedAt: challenge.updated_at.toISOString(),
      testCases: challenge.test_cases,
    };
  }

  static selectToChallengeDetailed(
    challenge: Select<'challenge'> & { owner: Select<'user'> }
  ): ChallengeWithUser {
    return {
      id: challenge.id,
      owner: UserRepository.selectToUser(challenge.owner),
      title: challenge.title,
      description: challenge.description,
      content: challenge.content,
      createdAt: challenge.created_at.toISOString(),
      updatedAt: challenge.updated_at.toISOString(),
    };
  }

  static selectToChallenge(challenge: Select<'challenge'>): Challenge {
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
