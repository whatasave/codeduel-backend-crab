import type { Database } from '@codeduel-backend-crab/database';
import { beforeEach, describe, expect, test } from 'bun:test';
import { setupTestDatabase } from '../../utils/test';
import { ChallengeRepository } from './repository';
import { UserRepository } from '../user/repository';
import type { Challenge, CreateChallenge } from './data';

describe('Route.Challenge.Repository', () => {
  let db: Database;
  let challenges: ChallengeRepository;
  let users: UserRepository;

  beforeEach(async () => {
    db = await setupTestDatabase();
    challenges = new ChallengeRepository(db);
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
      const challenge = await challenges.create(createChallenge);

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
        ownerId: user.id,
        title: 'Test Challenge',
        description: 'This is a test challenge',
        content: 'print("Hello, World!")',
      };

      const challenge = await challenges.create(createChallenge);

      const foundChallenge = await challenges.byId(challenge.id);

      expect(foundChallenge).toMatchObject(createChallenge);
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

      const foundChallenge = await challenges.byId(challenge.id + 1);

      expect(foundChallenge).toBeUndefined();
    });
  });

  describe('all', () => {
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
  });

  describe('update', () => {
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

      const updatedChallenge = await challenges.update({
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

      const challenge = await challenges.create({
        ownerId: user.id,
        title: 'Test Challenge',
        description: 'This is a test challenge',
        content: 'print("Hello, World!")',
      });

      const deleted = await challenges.delete(challenge.id);

      expect(deleted).toBe(true);

      const foundChallenge = await challenges.byId(challenge.id);
      expect(foundChallenge).toBeUndefined();

      const all = await challenges.all();
      expect(all).toEqual([]);
    });
  });
});
