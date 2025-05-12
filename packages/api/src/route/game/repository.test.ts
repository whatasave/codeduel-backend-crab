import type { Database } from '@codeduel-backend-crab/database';
import { beforeEach, describe, expect, test } from 'bun:test';
import { setupTestDatabase } from '../../utils/test';
import { GameRepository } from './repository';
import { UserRepository } from '../user/repository';
import type { CreateGame } from './data';
import { ChallengeRepository } from '../challenge/repository';

describe('Route.Game.Repository', () => {
  let db: Database;
  let repository: GameRepository;
  let users: UserRepository;
  let challenges: ChallengeRepository;

  beforeEach(async () => {
    db = await setupTestDatabase();
    repository = new GameRepository(db);
    users = new UserRepository(db);
    challenges = new ChallengeRepository(db);
  });

  describe('create', () => {
    let createGame: CreateGame;

    beforeEach(async () => {
      const user = await users.create({
        username: 'test',
      });
      const challenge = await challenges.create({
        ownerId: user.id,
        title: 'Test Challenge',
        description: 'This is a test challenge',
        content: 'print("Hello, World!")',
      });
      createGame = {
        challengeId: challenge.id,
        hostId: user.id,
        duration: 60,
        maxPlayers: 2,
        allowedLanguages: ['python', 'javascript'],
        userIds: [user.id],
      };
    });

    test('should create a game', async () => {
      const { game, users } = await repository.create(createGame);

      expect(game).toMatchObject(createGame);
      if (!createGame.userIds[0]) throw new Error('Should never happen');
      expect(users).toBe([
        {
          userId: createGame.userIds[0],
          showCode: false,
          testsPassed: 0,
        },
      ]);

      await db
        .selectFrom('challenge')
        .where('id', '=', game.id)
        .selectAll()
        .executeTakeFirstOrThrow();

      const gameUsers = await db
        .selectFrom('game_user')
        .where('game_id', '=', game.id)
        .selectAll()
        .execute();

      expect(gameUsers).toHaveLength(1);
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

      const challenge = await repository.create(createChallenge);

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
});
