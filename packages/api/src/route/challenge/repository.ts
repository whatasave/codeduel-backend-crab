import {
  jsonArrayFrom,
  jsonObjectFrom,
  sql,
  type Database,
  type Select,
} from '@codeduel-backend-crab/database';

import { UserRepository } from '@/route/user/repository';

import type {
  Challenge,
  ChallengeDetailed,
  ChallengeSummary,
  CreateChallenge,
  TestCase,
  UpdateChallenge,
} from './data';

type SelectChallengeSummary = Select<'challenge'> & {
  owner: Select<'user'>;
  test_case_count: number | string | null;
};

type SelectChallengeDetailed = Select<'challenge'> & {
  owner: Select<'user'>;
  test_cases: Select<'test_case'>[];
};

export class ChallengeRepository {
  constructor(private readonly database: Database) {}

  async byId(id: Challenge['id']): Promise<ChallengeSummary | undefined> {
    const [challenge] = await this.findSummaries(id);
    return challenge && ChallengeRepository.selectToChallengeSummary(challenge);
  }

  async all(): Promise<ChallengeSummary[]> {
    const challenges = await this.findSummaries();
    return challenges.map((challenge) => ChallengeRepository.selectToChallengeSummary(challenge));
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
      .orderBy(sql`RANDOM()`)
      .limit(1)
      .selectAll('challenge')
      .select((eb) =>
        jsonObjectFrom(
          eb.selectFrom('user').whereRef('user.id', '=', 'challenge.owner_id').selectAll('user')
        )
          .$notNull()
          .as('owner')
      )
      .select((eb) =>
        jsonArrayFrom(
          eb
            .selectFrom('test_case')
            .whereRef('test_case.challenge_id', '=', 'challenge.id')
            .orderBy('test_case.id')
            .selectAll('test_case')
        ).as('test_cases')
      )
      .executeTakeFirst();
    return challenge && ChallengeRepository.selectToChallengeDetailed(challenge);
  }

  /** Finds the challenges with their owner and number of test cases. */
  private async findSummaries(id?: Challenge['id']): Promise<SelectChallengeSummary[]> {
    return await this.database
      .selectFrom('challenge')
      .$if(id !== undefined, (qb) => qb.where('challenge.id', '=', id ?? -1))
      .orderBy('challenge.id')
      .selectAll('challenge')
      .select((eb) =>
        jsonObjectFrom(
          eb.selectFrom('user').whereRef('user.id', '=', 'challenge.owner_id').selectAll('user')
        )
          .$notNull()
          .as('owner')
      )
      .select((eb) =>
        eb
          .selectFrom('test_case')
          .whereRef('test_case.challenge_id', '=', 'challenge.id')
          .select(sql<number>`count(*)::int`.as('count'))
          .as('test_case_count')
      )
      .execute();
  }

  static selectToChallengeSummary(challenge: SelectChallengeSummary): ChallengeSummary {
    return {
      id: challenge.id,
      owner: UserRepository.selectToUserListItem(challenge.owner),
      title: challenge.title,
      description: challenge.description,
      content: challenge.content,
      testCases: Number(challenge.test_case_count ?? 0),
      createdAt: challenge.created_at,
    };
  }

  static selectToChallengeDetailed(challenge: SelectChallengeDetailed): ChallengeDetailed {
    const toTestCase = ({ input, output }: Select<'test_case'>): TestCase => ({ input, output });
    return {
      id: challenge.id,
      owner: UserRepository.selectToUserListItem(challenge.owner),
      title: challenge.title,
      description: challenge.description,
      content: challenge.content,
      testCases: challenge.test_cases.filter((tc) => !tc.hidden).map(toTestCase),
      hiddenTestCases: challenge.test_cases.filter((tc) => tc.hidden).map(toTestCase),
      createdAt: challenge.created_at,
    };
  }

  static selectToChallenge(challenge: Select<'challenge'>): Challenge {
    return {
      id: challenge.id,
      ownerId: challenge.owner_id,
      title: challenge.title,
      description: challenge.description,
      content: challenge.content,
      createdAt: challenge.created_at,
      updatedAt: challenge.updated_at,
    };
  }
}
