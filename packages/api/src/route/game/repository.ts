import {
  populate,
  populateArray,
  type Database,
  type Select,
} from '@codeduel-backend-crab/database';
import type {
  CreateGame,
  Game,
  ShareCode,
  UpdateGameUser,
  GameOfUser,
  GameWithUserData,
} from './data';
import type { User } from '../user/data';
import { sql } from 'kysely';

export class GameRepository {
  constructor(private readonly db: Database) {}

  async byId(id: Game['id']): Promise<GameWithUserData | undefined> {
    const game = await this.db
      .selectFrom('game')
      .where('id', '=', id)
      .selectAll()
      .select((eb) => populateArray(eb, 'game_user', 'game_id', 'id').as('users'))
      .select((eb) => populate(eb, 'user', 'id', 'host_id').$notNull().as('host'))
      .select((eb) =>
        populate(eb, 'challenge', 'id', 'challenge_id', (eb) =>
          eb
            .selectAll()
            .select((eb) => populateArray(eb, 'test_case', 'challenge_id', 'id').as('test_cases'))
            .select((eb) => populate(eb, 'user', 'id', 'owner_id').$notNull().as('owner'))
        )
          .$notNull()
          .as('challenge')
      )
      .executeTakeFirst();

    return game && this.selectToGameWithUserData(game);
  }

  async create(createGame: CreateGame): Promise<GameWithUserData> {
    return await this.db.transaction().execute(async (tx) => {
      const created = await tx
        .insertInto('game')
        .values((eb) => ({
          host_id: createGame.hostId,
          challenge_id:
            createGame.challengeId ??
            eb
              .selectFrom('challenge')
              .orderBy(sql`RANDOM()`)
              .limit(1),
          max_players: createGame.maxPlayers,
          allowed_languages: createGame.allowedLanguages,
          duration: createGame.duration,
        }))
        .returningAll()
        .executeTakeFirstOrThrow();

      await tx
        .insertInto('game_user')
        .values(
          createGame.userIds.map((userId) => ({
            game_id: created.id,
            user_id: userId,
          }))
        )
        .execute();

      const game = await new GameRepository(tx).byId(created.id);

      if (!game) {
        throw new Error('Game not found after creation');
      }

      return game;
    });
  }

  async updateUser(updateGameUser: UpdateGameUser): Promise<void> {
    await this.db
      .updateTable('game_user')
      .where('game_id', '=', updateGameUser.gameId)
      .where('user_id', '=', updateGameUser.userId)
      .set({
        code: updateGameUser.code,
        language: updateGameUser.language,
        tests_passed: updateGameUser.testsPassed,
        submitted_at: updateGameUser.submittedAt,
      })
      .execute();
  }

  async endGame(id: Game['id']): Promise<void> {
    await this.db
      .updateTable('game')
      .where('id', '=', id)
      .set({ ended_at: new Date().toISOString() })
      .execute();
  }

  async shareCode(shareCode: ShareCode): Promise<void> {
    await this.db
      .insertInto('game_user')
      .values({
        game_id: shareCode.gameId,
        user_id: shareCode.userId,
        show_code: shareCode.showCode,
      })
      .execute();
  }

  async byUserId(userId: User['id']): Promise<GameOfUser[]> {
    const games = await this.db
      .selectFrom('game_user')
      .where('user_id', '=', userId)
      .selectAll()
      .select((eb) =>
        populate(eb, 'game', 'id', 'game_id', (eb) =>
          eb
            .selectAll()
            .select((eb) => populate(eb, 'user', 'id', 'host_id').$notNull().as('host'))
            .select((eb) =>
              populate(eb, 'challenge', 'id', 'challenge_id', (eb) =>
                eb
                  .selectAll()
                  .select((eb) =>
                    populateArray(eb, 'test_case', 'challenge_id', 'id').as('test_cases')
                  )
                  .select((eb) => populate(eb, 'user', 'id', 'owner_id').$notNull().as('owner'))
              )
                .$notNull()
                .as('challenge')
            )
        )
          .$notNull()
          .as('game')
      )
      .execute();
    return games.map((game) => this.selectToGameOfUser(game));
  }

  private selectToGame(
    game: Select<'game'> & { host: Select<'user'> } & {
      challenge: Select<'challenge'> & { owner: Select<'user'>; test_cases: Select<'test_case'>[] };
    }
  ): Game {
    return {
      id: game.id,
      host: {
        id: game.host.id,
        username: game.host.username,
        name: game.host.name ?? undefined,
        avatar: game.host.avatar ?? undefined,
        backgroundImage: game.host.background_image ?? undefined,
        biography: game.host.biography ?? undefined,
        createdAt: game.host.created_at.toISOString(),
        updatedAt: game.host.updated_at.toISOString(),
      },
      challenge: {
        id: game.challenge_id,
        owner: {
          id: game.challenge.owner.id,
          username: game.challenge.owner.username,
          name: game.challenge.owner.name ?? undefined,
          avatar: game.challenge.owner.avatar ?? undefined,
          backgroundImage: game.challenge.owner.background_image ?? undefined,
          biography: game.challenge.owner.biography ?? undefined,
          createdAt: game.challenge.owner.created_at.toISOString(),
          updatedAt: game.challenge.owner.updated_at.toISOString(),
        },
        title: game.challenge.title,
        description: game.challenge.description,
        content: game.challenge.content,
        createdAt: game.challenge.created_at.toISOString(),
        updatedAt: game.challenge.updated_at.toISOString(),
        testCases: game.challenge.test_cases.map((testCase) => ({
          id: testCase.id,
          input: testCase.input,
          output: testCase.output,
        })),
      },
      maxPlayers: game.max_players,
      allowedLanguages: game.allowed_languages as string[],
      duration: game.duration,
      endedAt: game.ended_at ? game.ended_at.toISOString() : undefined,
    };
  }

  private selectToGameOfUser(
    userGame: Select<'game_user'> & {
      game: Select<'game'> & { host: Select<'user'> } & {
        challenge: Select<'challenge'> & {
          owner: Select<'user'>;
          test_cases: Select<'test_case'>[];
        };
      };
    }
  ): GameOfUser {
    return {
      user: {
        code: userGame.code ?? undefined,
        language: userGame.language ?? undefined,
        testsPassed: userGame.tests_passed,
        showCode: userGame.show_code,
        submittedAt: userGame.submitted_at?.toISOString() ?? undefined,
      },
      game: this.selectToGame(userGame.game),
    };
  }

  private selectToGameWithUserData(
    game: Select<'game'> & { host: Select<'user'> } & {
      challenge: Select<'challenge'> & { owner: Select<'user'>; test_cases: Select<'test_case'>[] };
    } & { users: Select<'game_user'>[] }
  ): GameWithUserData {
    return {
      game: this.selectToGame(game),
      users: game.users.map((user) => ({
        code: user.code ?? undefined,
        language: user.language ?? undefined,
        testsPassed: user.tests_passed,
        showCode: user.show_code,
        submittedAt: user.submitted_at?.toISOString() ?? undefined,
      })),
    };
  }
}
