import type { Database } from '@codeduel-backend-crab/database';
import { beforeEach, describe, expect, test } from 'bun:test';
import { setupTestDatabase } from '../../test';
import { ChallengeRepository } from './repository';
import { UserRepository } from '../user/repository';
import type { Challenge } from './data';

describe('Challenge Repository', () => {
  let db: Database;
  let challenges: ChallengeRepository;
  let users: UserRepository;

  beforeEach(async () => {
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

    if (!challenge) throw new Error();

    await db
      .selectFrom('challenge')
      .where('id', '=', challenge.id)
      .selectAll()
      .executeTakeFirstOrThrow();
  });

  test('should return undefined on create conflict', async () => {
    const user = await users.create({
      username: 'test',
    });

    const challenge = await challenges.create({
      ownerId: user.id,
      title: 'Test Challenge',
      description: 'This is a test challenge',
      content: 'print("Hello, World!")',
    });

    if (!challenge) throw new Error();

    const duplicateChallenge = await challenges.create({
      ownerId: user.id,
      title: 'Test Challenge',
      description: 'This is a test challenge',
      content: 'print("Hello, World!")',
    });

    expect(duplicateChallenge).toBeUndefined();
  });

  test('should get a challenge by id', async () => {
    const user = await users.create({
      username: 'test',
    });

    const challenge = await challenges.create({
      ownerId: user.id,
      title: 'Test Challenge',
      description: 'This is a test challenge',
      content: 'print("Hello, World!")',
    });

    if (!challenge) throw new Error();

    const foundChallenge = await challenges.byId(challenge.id);

    expect(foundChallenge).toMatchObject({
      id: challenge.id,
      ownerId: user.id,
      title: 'Test Challenge',
      description: 'This is a test challenge',
      content: 'print("Hello, World!")',
    });
  });

  test('should return undefined if challenge not found', async () => {
    const user = await users.create({
      username: 'test',
    });

    const challenge = await challenges.create({
      ownerId: user.id,
      title: 'Test Challenge',
      description: 'This is a test challenge',
      content: 'print("Hello, World!")',
    });

    if (!challenge) throw new Error();

    const foundChallenge = await challenges.byId(challenge.id + 1);

    expect(foundChallenge).toBeUndefined();
  });

  test('should get all challenges', async () => {
    const user = await users.create({
      username: 'test',
    });

    const created = await Promise.all([
      challenges.create({
        ownerId: user.id,
        title: 'Test Challenge 1',
        description: 'This is a test challenge 1',
        content: 'print("Hello, World!")',
      }),
      challenges.create({
        ownerId: user.id,
        title: 'Test Challenge 2',
        description: 'This is a test challenge 2',
        content: 'print("Hello, World!")',
      }),
    ]);

    const all = await challenges.all();

    expect(all).toEqual(created as Challenge[]);
  });

  test('should update a challenge', async () => {
    const user = await users.create({
      username: 'test',
    });

    const challenge = await challenges.create({
      ownerId: user.id,
      title: 'Test Challenge',
      description: 'This is a test challenge',
      content: 'print("Hello, World!")',
    });

    if (!challenge) throw new Error();

    const updatedChallenge = await challenges.update({
      id: challenge.id,
      title: 'Updated Challenge',
      description: 'This is an updated test challenge',
      content: 'print("Hello, Updated World!")',
    });

    expect(updatedChallenge).toMatchObject({
      id: challenge.id,
      title: 'Updated Challenge',
      description: 'This is an updated test challenge',
      content: 'print("Hello, Updated World!")',
    });
  });

  test('should return undefined on update not found', async () => {
    const user = await users.create({
      username: 'test',
    });

    const challenge = await challenges.create({
      ownerId: user.id,
      title: 'Test Challenge',
      description: 'This is a test challenge',
      content: 'print("Hello, World!")',
    });

    if (!challenge) throw new Error();

    const updatedChallenge = await challenges.update({
      id: challenge.id + 1,
      title: 'Updated Challenge',
      description: 'This is an updated test challenge',
      content: 'print("Hello, Updated World!")',
    });

    expect(updatedChallenge).toBeUndefined();
  });

  test('should delete a challenge', async () => {
    const user = await users.create({
      username: 'test',
    });

    const challenge = await challenges.create({
      ownerId: user.id,
      title: 'Test Challenge',
      description: 'This is a test challenge',
      content: 'print("Hello, World!")',
    });

    if (!challenge) throw new Error();

    const deleted = await challenges.delete(challenge.id);

    expect(deleted).toBe(true);

    const foundChallenge = await challenges.byId(challenge.id);
    expect(foundChallenge).toBeUndefined();

    const all = await challenges.all();
    expect(all).toEqual([]);
  });
});
