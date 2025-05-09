import type { Database, Select } from '@codeduel-backend-crab/database';
import type {
  ChallengeDetailed,
  GameChallenge,
  CreateChallenge,
  TestCase,
  UpdateChallenge,
  Challenge,
} from './data';
import { sql } from 'kysely';

export class ChallengeRepository {
  constructor(private readonly database: Database) {}

  async byId(id: ChallengeDetailed['id']): Promise<GameChallenge | undefined> {
    const challenge = await this.database
      .selectFrom('challenge')
      .where('id', '=', id)
      .innerJoin('user as owner', (join) => join.onRef('owner_id', '=', 'owner.id'))
      .select([
        'challenge.id',
        'challenge.title',
        'challenge.description',
        'challenge.content',
        'challenge.created_at',
        'challenge.updated_at',
        'owner.id as owner_id',
        'owner.username as owner_username',
        'owner.name as owner_name',
        'owner.avatar as owner_avatar',
        'owner.background_image as owner_background_image',
        'owner.biography as owner_biography',
        'owner.created_at as owner_created_at',
        'owner.updated_at as owner_updated_at',
      ])
      .executeTakeFirst();
    if (!challenge) return undefined;
    const test_cases = await this.database
      .selectFrom('test_case')
      .where('challenge_id', '=', challenge.id)
      .selectAll()
      .execute();
    return this.selectToGameChallenge({ ...challenge, test_cases });
  }

  async all(): Promise<ChallengeDetailed[]> {
    const challenges = await this.database
      .selectFrom('challenge')
      .innerJoin('user as owner', (join) => join.onRef('owner_id', '=', 'owner.id'))
      .select([
        'challenge.id',
        'challenge.title',
        'challenge.description',
        'challenge.content',
        'challenge.created_at',
        'challenge.updated_at',
        'owner.id as owner_id',
        'owner.username as owner_username',
        'owner.name as owner_name',
        'owner.avatar as owner_avatar',
        'owner.background_image as owner_background_image',
        'owner.biography as owner_biography',
        'owner.created_at as owner_created_at',
        'owner.updated_at as owner_updated_at',
      ])
      .execute();
    return challenges.map(this.selectToChallengeDetailed.bind(this));
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

  async delete(id: ChallengeDetailed['id']): Promise<boolean> {
    const result = await this.database
      .deleteFrom('challenge')
      .where('id', '=', id)
      .executeTakeFirst();
    return result.numDeletedRows > 0;
  }

  async random(): Promise<GameChallenge | undefined> {
    const challenge = await this.database
      .selectFrom('challenge')
      .innerJoin('user as owner', (join) => join.onRef('owner_id', '=', 'owner.id'))
      .select([
        'challenge.id',
        'challenge.title',
        'challenge.description',
        'challenge.content',
        'challenge.created_at',
        'challenge.updated_at',
        'owner.id as owner_id',
        'owner.username as owner_username',
        'owner.name as owner_name',
        'owner.avatar as owner_avatar',
        'owner.background_image as owner_background_image',
        'owner.biography as owner_biography',
        'owner.created_at as owner_created_at',
        'owner.updated_at as owner_updated_at',
      ])
      .orderBy(sql`RANDOM()`)
      .limit(1)
      .selectAll()
      .executeTakeFirst();
    if (!challenge) return undefined;
    const test_cases = await this.database
      .selectFrom('test_case')
      .where('challenge_id', '=', challenge.id)
      .selectAll()
      .execute();
    return this.selectToGameChallenge({ ...challenge, test_cases });
  }

  private selectToGameChallenge(
    challenge: Select<'challenge'> & Select<'user', 'owner_'> & { test_cases: TestCase[] }
  ): GameChallenge {
    return {
      id: challenge.id,
      owner: {
        id: challenge.owner_id,
        username: challenge.owner_username,
        name: challenge.owner_name ?? undefined,
        avatar: challenge.owner_avatar ?? undefined,
        backgroundImage: challenge.owner_background_image ?? undefined,
        biography: challenge.owner_biography ?? undefined,
        createdAt: challenge.owner_created_at.toISOString(),
        updatedAt: challenge.owner_updated_at.toISOString(),
      },
      title: challenge.title,
      description: challenge.description,
      content: challenge.content,
      createdAt: challenge.created_at.toISOString(),
      updatedAt: challenge.updated_at.toISOString(),
      testCases: challenge.test_cases,
    };
  }

  private selectToChallengeDetailed(
    challenge: Select<'challenge'> & Select<'user', 'owner_'>
  ): ChallengeDetailed {
    return {
      id: challenge.id,
      owner: {
        id: challenge.owner_id,
        username: challenge.owner_username,
        name: challenge.owner_name ?? undefined,
        avatar: challenge.owner_avatar ?? undefined,
        backgroundImage: challenge.owner_background_image ?? undefined,
        biography: challenge.owner_biography ?? undefined,
        createdAt: challenge.owner_created_at.toISOString(),
        updatedAt: challenge.owner_updated_at.toISOString(),
      },
      title: challenge.title,
      description: challenge.description,
      content: challenge.content,
      createdAt: challenge.created_at.toISOString(),
      updatedAt: challenge.updated_at.toISOString(),
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
