import type { Database } from '@codeduel-backend-crab/database';
import { beforeAll, describe, expect, test } from 'bun:test';
import { setupTestDatabase } from '../../test';
import { ChallengeRepository } from './repository';
import { UserRepository } from '../user/repository';

describe('Challenge Repository', () => {
  let db: Database;
  let challenges: ChallengeRepository;
  let users: UserRepository;

  beforeAll(async () => {
    db = await setupTestDatabase();
    challenges = new ChallengeRepository(db);
    users = new UserRepository(db);
  });

  test('should create a challenge', async () => {
    const user = await users.create({
      username: 'test',
    });

    const challenge = await challenges.create({
      ownerId: user.id,
      title: 'Test Challenge',
      description: 'This is a test challenge',
      content: 'print("Hello, World!")',
    });

    expect(challenge).toMatchObject({
      ownerId: user.id,
      title: 'Test Challenge',
      description: 'This is a test challenge',
      content: 'print("Hello, World!")',
    });

    if (!challenge) throw new Error('Should not happen');

    await db
      .selectFrom('challenge')
      .where('id', '=', challenge.id)
      .selectAll()
      .executeTakeFirstOrThrow();
  });
});
