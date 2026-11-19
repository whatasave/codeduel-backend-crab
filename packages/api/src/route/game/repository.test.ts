import { beforeEach, describe, expect, test } from 'bun:test';

import type { Database } from '@codeduel-backend-crab/database';

import type { Challenge } from '@/route/challenge/data';
import { ChallengeRepository } from '@/route/challenge/repository';
import type { User } from '@/route/user/data';
import { UserRepository } from '@/route/user/repository';
import { setupTestDatabase } from '@/utils/test';

import { DEFAULT_MODE } from './data';
import { GameRepository, type NewGame } from './repository';

describe('Route.Game.Repository', () => {
  let db: Database;
  let repository: GameRepository;
  let users: UserRepository;
  let challenges: ChallengeRepository;

  let host: User;
  let guest: User;
  let challenge: Challenge;
  let newGame: NewGame;

  beforeEach(async () => {
    db = await setupTestDatabase();
    repository = new GameRepository(db);
    users = new UserRepository(db);
    challenges = new ChallengeRepository(db);

    host = await users.create({ username: 'host', name: 'Host' });
    guest = await users.create({ username: 'guest' });

    challenge = await challenges.create({
      ownerId: host.id,
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

    newGame = {
      uniqueId: '6a1f7f8e-2c4b-4d39-9a43-5f0f7d3c1b11',
      challengeId: challenge.id,
      ownerId: host.id,
      gameDuration: 900,
      maxPlayers: 8,
      allowedLanguages: ['python', 'javascript'],
      users: [host.id, guest.id],
    };
  });

  describe('create', () => {
    test('should create a game', async () => {
      const { game, userData } = await repository.create(newGame);

      expect(game).toMatchObject({
        uniqueId: newGame.uniqueId,
        ownerId: host.id,
        ended: false,
        mode: DEFAULT_MODE,
        maxPlayers: 8,
        duration: 900,
        allowedLanguages: ['python', 'javascript'],
        challenge: {
          id: challenge.id,
          owner: { id: host.id, username: 'host', name: 'Host' },
          title: challenge.title,
          testCases: 2,
        },
      });
      expect(userData).toEqual([
        {
          user: { id: host.id, username: 'host', name: 'Host', createdAt: host.createdAt },
          testsPassed: 0,
          showCode: false,
        },
        {
          user: { id: guest.id, username: 'guest', createdAt: guest.createdAt },
          testsPassed: 0,
          showCode: false,
        },
      ]);
    });

    test('should create a game with random challenge', async () => {
      const { game } = await repository.create({ ...newGame, challengeId: undefined });

      expect(game.challenge.id).toBe(challenge.id);
    });

    test('should ignore duplicated users', async () => {
      const { userData } = await repository.create({
        ...newGame,
        users: [host.id, host.id],
      });

      expect(userData).toHaveLength(1);
    });

    test('should create an already ended game', async () => {
      const { game } = await repository.create({ ...newGame, ended: true });

      expect(game.ended).toBe(true);
    });

    test('should fail on duplicated unique id', async () => {
      await repository.create(newGame);

      const error = await repository.create(newGame).then(
        () => undefined,
        (error: unknown) => error
      );
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('byUniqueId', () => {
    test('should get a game by unique id', async () => {
      const created = await repository.create(newGame);

      const found = await repository.byUniqueId(newGame.uniqueId);

      expect(found).toEqual(created);
    });

    test('should return undefined if game not found', async () => {
      await repository.create(newGame);

      const found = await repository.byUniqueId('not-a-game');

      expect(found).toBeUndefined();
    });
  });

  describe('all', () => {
    test('should get all the games, newest first', async () => {
      const first = await repository.create(newGame);
      const second = await repository.create({ ...newGame, uniqueId: 'second' });

      expect(await repository.all()).toEqual([second, first]);
    });
  });

  describe('updateSubmission', () => {
    test('should update the submission of a player', async () => {
      await repository.create(newGame);
      const submittedAt = new Date().toISOString();

      const updated = await repository.updateSubmission(
        newGame.uniqueId,
        { userId: guest.id, code: 'print(1)', language: 'python', testsPassed: 2 },
        submittedAt
      );

      expect(updated).toBe(true);
      const game = await repository.byUniqueId(newGame.uniqueId);
      const guestData = game?.userData.find((data) => data.user.id === guest.id);
      expect(guestData).toMatchObject({ code: 'print(1)', language: 'python', testsPassed: 2 });
      expect(new Date(guestData?.submittedAt ?? 0).getTime()).toBe(new Date(submittedAt).getTime());
    });

    test('should return false if the game does not exist', async () => {
      await repository.create(newGame);

      const updated = await repository.updateSubmission(
        'not-a-game',
        { userId: guest.id, code: 'print(1)', language: 'python', testsPassed: 2 },
        new Date().toISOString()
      );

      expect(updated).toBe(false);
    });

    test('should return false if the user is not in the game', async () => {
      await repository.create({ ...newGame, users: [host.id] });

      const updated = await repository.updateSubmission(
        newGame.uniqueId,
        { userId: guest.id, code: 'print(1)', language: 'python', testsPassed: 2 },
        new Date().toISOString()
      );

      expect(updated).toBe(false);
    });
  });

  describe('endGame', () => {
    test('should end a game', async () => {
      await repository.create(newGame);

      expect(await repository.endGame(newGame.uniqueId)).toBe(true);
      expect((await repository.byUniqueId(newGame.uniqueId))?.game.ended).toBe(true);
    });

    test('should not change the end time of an ended game', async () => {
      await repository.create(newGame);
      await repository.endGame(newGame.uniqueId);
      const { ended_at: endedAt } = await db
        .selectFrom('game')
        .select('ended_at')
        .executeTakeFirstOrThrow();

      expect(await repository.endGame(newGame.uniqueId)).toBe(true);

      const { ended_at: endedAtAgain } = await db
        .selectFrom('game')
        .select('ended_at')
        .executeTakeFirstOrThrow();
      expect(endedAtAgain).toBe(endedAt);
    });

    test('should return false if the game does not exist', async () => {
      expect(await repository.endGame('not-a-game')).toBe(false);
    });
  });

  describe('shareCode', () => {
    test('should share the code by unique id', async () => {
      await repository.create(newGame);

      expect(await repository.shareCode(newGame.uniqueId, guest.id, true)).toBe(true);

      const game = await repository.byUniqueId(newGame.uniqueId);
      expect(game?.userData.find((data) => data.user.id === guest.id)?.showCode).toBe(true);
      expect(game?.userData.find((data) => data.user.id === host.id)?.showCode).toBe(false);
    });

    test('should share the code by numeric id', async () => {
      const { game } = await repository.create(newGame);

      expect(await repository.shareCode(game.id, guest.id, true)).toBe(true);
    });

    test('should return false if the game does not exist', async () => {
      expect(await repository.shareCode('not-a-game', guest.id, true)).toBe(false);
    });
  });

  describe('byUserId', () => {
    test('should get the games of a user with their data', async () => {
      const first = await repository.create(newGame);
      await repository.create({ ...newGame, uniqueId: 'host-only', users: [host.id] });

      const games = await repository.byUserId(guest.id);

      expect(games).toEqual([
        {
          game: first.game,
          userData: {
            user: { id: guest.id, username: 'guest', createdAt: guest.createdAt },
            testsPassed: 0,
            showCode: false,
          },
        },
      ]);
    });

    test('should return an empty array if the user has no games', async () => {
      await repository.create({ ...newGame, users: [host.id] });

      expect(await repository.byUserId(guest.id)).toEqual([]);
    });
  });
});
