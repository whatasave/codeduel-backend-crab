import { beforeEach, describe, expect, test } from 'bun:test';

import type { Database } from '@codeduel-backend-crab/database';

import { UserRepository } from '@/route/user/repository';
import { setupTestDatabase } from '@/utils/test';

import type { CreateChallenge } from './data';
import { ChallengeRepository } from './repository';

describe('Route.Challenge.Repository', () => {
  let db: Database;
  let repository: ChallengeRepository;
  let users: UserRepository;

  beforeEach(async () => {
    db = await setupTestDatabase();
    repository = new ChallengeRepository(db);
    users = new UserRepository(db);
  });

  describe('create', () => {
    let createChallenge: CreateChallenge;

    beforeEach(async () => {
      const user = await users.create({
        username: 'test',
      });
      createChallenge = {
        ownerId: user.id,
        title: 'Test Challenge',
        description: 'This is a test challenge',
        content: 'print("Hello, World!")',
      };
    });

    test('should create a challenge', async () => {
      const challenge = await repository.create(createChallenge);

      expect(challenge).toMatchObject(createChallenge);

      await db
        .selectFrom('challenge')
        .where('id', '=', challenge.id)
        .selectAll()
        .executeTakeFirstOrThrow();
    });
  });

  describe('byId', () => {
    test('should get a challenge by id', async () => {
      const user = await users.create({
        username: 'test',
      });

      const createChallenge = {
        title: 'Test Challenge',
        description: 'This is a test challenge',
        content: 'print("Hello, World!")',
      };

      const challenge = await repository.create({ ...createChallenge, ownerId: user.id });

      const foundChallenge = await repository.byId(challenge.id);

      expect(foundChallenge).toMatchObject(createChallenge);
    });

    test('should return undefined if challenge not found', async () => {
      const user = await users.create({
        username: 'test',
      });

      const challenge = await repository.create({
        ownerId: user.id,
        title: 'Test Challenge',
        description: 'This is a test challenge',
        content: 'print("Hello, World!")',
      });

      const foundChallenge = await repository.byId(challenge.id + 1);

      expect(foundChallenge).toBeUndefined();
    });
  });

  describe('all', () => {
    test('should get all challenges', async () => {
      const user = await users.create({
        username: 'test',
      });

      const created = await Promise.all([
        repository.create({
          ownerId: user.id,
          title: 'Test Challenge 1',
          description: 'This is a test challenge 1',
          content: 'print("Hello, World!")',
        }),
        repository.create({
          ownerId: user.id,
          title: 'Test Challenge 2',
          description: 'This is a test challenge 2',
          content: 'print("Hello, World!")',
        }),
      ]);

      const all = await repository.all();

      expect(all).toEqual(
        created
          .toSorted((a, b) => a.id - b.id)
          .map(({ ownerId: _, updatedAt: __, ...created }) => ({
            ...created,
            owner: {
              id: user.id,
              username: user.username,
              createdAt: user.createdAt,
            },
            testCases: 0,
          }))
      );
    });

    test('should count the test cases of each challenge', async () => {
      const user = await users.create({ username: 'test' });
      const challenge = await repository.create({
        ownerId: user.id,
        title: 'Test Challenge',
        description: 'This is a test challenge',
        content: 'print("Hello, World!")',
      });
      await db
        .insertInto('test_case')
        .values([
          { challenge_id: challenge.id, input: '1', output: '1', hidden: false },
          { challenge_id: challenge.id, input: '2', output: '2', hidden: true },
        ])
        .execute();

      const [found] = await repository.all();
      expect(found?.testCases).toBe(2);
      expect((await repository.byId(challenge.id))?.testCases).toBe(2);
    });
  });

  describe('update', () => {
    test('should update a challenge', async () => {
      const user = await users.create({
        username: 'test',
      });

      const challenge = await repository.create({
        ownerId: user.id,
        title: 'Test Challenge',
        description: 'This is a test challenge',
        content: 'print("Hello, World!")',
      });

      const updatedChallenge = await repository.update({
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

      const challenge = await repository.create({
        ownerId: user.id,
        title: 'Test Challenge',
        description: 'This is a test challenge',
        content: 'print("Hello, World!")',
      });

      const updatedChallenge = await repository.update({
        id: challenge.id + 1,
        title: 'Updated Challenge',
        description: 'This is an updated test challenge',
        content: 'print("Hello, Updated World!")',
      });

      expect(updatedChallenge).toBeUndefined();
    });
  });

  describe('delete', () => {
    test('should delete a challenge', async () => {
      const user = await users.create({
        username: 'test',
      });

      const challenge = await repository.create({
        ownerId: user.id,
        title: 'Test Challenge',
        description: 'This is a test challenge',
        content: 'print("Hello, World!")',
      });

      const deleted = await repository.delete(challenge.id);

      expect(deleted).toBe(true);

      const foundChallenge = await repository.byId(challenge.id);
      expect(foundChallenge).toBeUndefined();

      const all = await repository.all();
      expect(all).toEqual([]);
    });
  });

  describe('random', () => {
    test('should get a random challenge', async () => {
      const user = await users.create({
        username: 'test',
      });

      const created = await Promise.all([
        repository.create({
          ownerId: user.id,
          title: 'Test Challenge 1',
          description: 'This is a test challenge 1',
          content: 'print("Hello, World!")',
        }),
        repository.create({
          ownerId: user.id,
          title: 'Test Challenge 2',
          description: 'This is a test challenge 2',
          content: 'print("Hello, World!")',
        }),
      ]);
      const randomChallenge = await repository.random();
      expect(randomChallenge).toBeDefined();
      expect(created.map((c) => c.id)).toContain(randomChallenge?.id ?? -1);
      expect(randomChallenge).toMatchObject({ testCases: [], hiddenTestCases: [] });
    });

    test('should split visible and hidden test cases', async () => {
      const user = await users.create({ username: 'test' });
      const challenge = await repository.create({
        ownerId: user.id,
        title: 'Test Challenge',
        description: 'This is a test challenge',
        content: 'print("Hello, World!")',
      });
      await db
        .insertInto('test_case')
        .values([
          { challenge_id: challenge.id, input: '1', output: 'one', hidden: false },
          { challenge_id: challenge.id, input: '2', output: 'two', hidden: true },
          { challenge_id: challenge.id, input: '3', output: 'three', hidden: true },
        ])
        .execute();

      const randomChallenge = await repository.random();

      expect(randomChallenge).toEqual({
        id: challenge.id,
        owner: { id: user.id, username: user.username, createdAt: user.createdAt },
        title: challenge.title,
        description: challenge.description,
        content: challenge.content,
        testCases: [{ input: '1', output: 'one' }],
        hiddenTestCases: [
          { input: '2', output: 'two' },
          { input: '3', output: 'three' },
        ],
        createdAt: challenge.createdAt,
      });
    });

    test('should return undefined if no challenges exist', async () => {
      const randomChallenge = await repository.random();
      expect(randomChallenge).toBeUndefined();
    });
  });
});
