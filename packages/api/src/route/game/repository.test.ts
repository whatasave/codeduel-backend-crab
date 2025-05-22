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

  let createGame: CreateGame;

  beforeEach(async () => {
    db = await setupTestDatabase();
    repository = new GameRepository(db);
    users = new UserRepository(db);
    challenges = new ChallengeRepository(db);

    const host = await users.create({
      username: 'host',
    });

    const challenge = await challenges.create({
      ownerId: host.id,
      title: 'Test Challenge',
      description: 'This is a test challenge',
      content: 'print("Hello, World!")',
    });

    createGame = {
      challengeId: challenge.id,
      hostId: host.id,
      duration: 60,
      maxPlayers: 2,
      allowedLanguages: ['python', 'javascript'],
      userIds: [host.id],
    };
  });

  describe('create', () => {
    test('should create a game', async () => {
      const { game, users } = await repository.create(createGame);

      const { challengeId: _, hostId: __, userIds: ___, ...requiremets } = createGame;

      expect(game).toMatchObject(requiremets);
      expect(game.challenge.id).toBe(createGame.challengeId ?? -1);
      expect(game.host.id).toBe(createGame.hostId);
      if (!createGame.userIds[0]) throw new Error('Should never happen');
      expect(users).toEqual([
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

    test('should create a game with random challenge', async () => {
      const { game, users } = await repository.create({ ...createGame, challengeId: undefined });

      const { challengeId: _, hostId: __, userIds: ___, ...requiremets } = createGame;
      expect(game).toMatchObject(requiremets);
      expect(game.host.id).toBe(createGame.hostId);
      if (!createGame.userIds[0]) throw new Error('Should never happen');
      expect(users).toEqual([
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

      await challenges.create({
        ownerId: user.id,
        title: 'Test Challenge',
        description: 'This is a test challenge',
        content: 'print("Hello, World!")',
      });

      const createGame: CreateGame = {
        hostId: user.id,
        challengeId: undefined,
        duration: 60,
        maxPlayers: 2,
        allowedLanguages: ['python', 'javascript'],
        userIds: [user.id],
      };

      const { game } = await repository.create(createGame);

      const foundGame = await repository.byId(game.id);

      if (!foundGame) throw new Error('Game not found');

      const { challengeId: _, hostId: __, userIds: ___, ...requiremets } = createGame;
      expect(foundGame.game).toMatchObject(requiremets);
      expect(foundGame.game.host.id).toBe(createGame.hostId);
      expect(foundGame.game.challenge.id).toBe(game.challenge.id);
    });

    test('should return undefined if challenge not found', async () => {
      const user = await users.create({
        username: 'test',
      });

      await challenges.create({
        ownerId: user.id,
        title: 'Test Challenge',
        description: 'This is a test challenge',
        content: 'print("Hello, World!")',
      });

      const createGame: CreateGame = {
        hostId: user.id,
        challengeId: undefined,
        duration: 60,
        maxPlayers: 2,
        allowedLanguages: ['python', 'javascript'],
        userIds: [user.id],
      };

      const { game } = await repository.create(createGame);

      const foundGame = await repository.byId(game.id + 1);

      expect(foundGame).toBeUndefined();
    });
  });

  describe('updateUser', () => {
    test('should update user in game', async () => {
      const { game, users } = await repository.create(createGame);

      if (!users[0]) throw new Error('User list is empty');

      await repository.updateUser(
        {
          gameId: game.id,
          userId: users[0].userId,
          code: 'print("Hello, World!")',
          language: 'python',
          testsPassed: 1,
        },
        new Date().toISOString()
      );

      const updatedGame = await repository.byId(game.id);
      if (!updatedGame) throw new Error('Game not found');

      const updatedUser = updatedGame.users[0];
      if (!updatedUser) throw new Error('User not found');

      expect(updatedUser.code).toBe('print("Hello, World!")');
      expect(updatedUser.language).toBe('python');
      expect(updatedUser.testsPassed).toBe(1);
      expect(updatedUser.submittedAt).toBeDefined();
      expect(updatedUser.userId).toBe(users[0].userId);
    });
  });

  describe('endGame', () => {
    test('should end game', async () => {
      const { game } = await repository.create(createGame);

      await repository.endGame(game.id);

      const endedGame = await repository.byId(game.id);
      if (!endedGame) throw new Error('Game not found');

      expect(endedGame.game.endedAt).toBeDefined();
    });
  });

  describe('shareCode', () => {
    test('should share code', async () => {
      const { game, users } = await repository.create(createGame);

      if (!users[0]) throw new Error('User list is empty');

      await repository.shareCode({
        gameId: game.id,
        userId: users[0].userId,
        showCode: true,
      });

      const updatedGame = await repository.byId(game.id);
      if (!updatedGame) throw new Error('Game not found');

      const updatedUser = updatedGame.users[0];
      if (!updatedUser) throw new Error('User not found');

      expect(updatedUser.showCode).toBe(true);
    });
  });

  describe('byUserId', () => {
    test('should get games by user id', async () => {
      const user = await users.byUsername('host');
      if (!user) throw new Error('User not found');

      await repository.create(createGame);

      const games = await repository.byUserId(user.id);

      if (!games[0]) throw new Error('Game not found');

      expect(games[0].game.host.id).toBe(user.id);
    });
  });
});
