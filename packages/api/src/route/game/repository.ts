import {
  jsonArrayFrom,
  jsonObjectFrom,
  sql,
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
import { UserRepository } from '../user/repository';
import { ChallengeRepository } from '../challenge/repository';

export class GameRepository {
  constructor(private readonly db: Database) {}

  async byId(id: Game['id']): Promise<GameWithUserData | undefined> {
    const game = await this.db
      .selectFrom('game')
      .where('id', '=', id)
      .selectAll()
      .select((eb) =>
        jsonArrayFrom(eb.selectFrom('game_user').whereRef('game_id', '=', 'id').selectAll()).as(
          'users'
        )
      )
      .select((eb) =>
        jsonObjectFrom(eb.selectFrom('user').whereRef('id', '=', 'host_id').selectAll())
          .$notNull()
          .as('host')
      )
      .select((eb) =>
        jsonObjectFrom(
          eb
            .selectFrom('challenge')
            .whereRef('id', '=', 'challenge_id')
            .selectAll()
            .select((eb) =>
              jsonArrayFrom(
                eb.selectFrom('test_case').whereRef('challenge_id', '=', 'id').selectAll()
              ).as('test_cases')
            )
            .select((eb) =>
              jsonObjectFrom(eb.selectFrom('user').whereRef('id', '=', 'owner_id').selectAll())
                .$notNull()
                .as('owner')
            )
        )
          .$notNull()
          .as('challenge')
      )
      .executeTakeFirst();

    return game && GameRepository.selectToGameWithUserData(game);
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
              .limit(1)
              .select('id'),
          max_players: createGame.maxPlayers,
          allowed_languages: JSON.stringify(createGame.allowedLanguages),
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

  async updateUser(updateGameUser: UpdateGameUser, submittedAt: string): Promise<void> {
    await this.db
      .updateTable('game_user')
      .where('game_id', '=', updateGameUser.gameId)
      .where('user_id', '=', updateGameUser.userId)
      .set({
        code: updateGameUser.code,
        language: updateGameUser.language,
        tests_passed: updateGameUser.testsPassed,
        submitted_at: submittedAt,
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
      .updateTable('game_user')
      .where('game_id', '=', shareCode.gameId)
      .where('user_id', '=', shareCode.userId)
      .set({
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
        jsonObjectFrom(
          eb
            .selectFrom('game')
            .whereRef('id', '=', 'game_id')
            .selectAll()
            .select((eb) =>
              jsonArrayFrom(
                eb.selectFrom('game_user').whereRef('game_id', '=', 'id').selectAll()
              ).as('users')
            )
            .select((eb) =>
              jsonObjectFrom(eb.selectFrom('user').whereRef('id', '=', 'host_id').selectAll())
                .$notNull()
                .as('host')
            )
            .select((eb) =>
              jsonObjectFrom(
                eb
                  .selectFrom('challenge')
                  .whereRef('id', '=', 'challenge_id')
                  .selectAll()
                  .select((eb) =>
                    jsonArrayFrom(
                      eb.selectFrom('test_case').whereRef('challenge_id', '=', 'id').selectAll()
                    ).as('test_cases')
                  )
                  .select((eb) =>
                    jsonObjectFrom(
                      eb.selectFrom('user').whereRef('id', '=', 'owner_id').selectAll()
                    )
                      .$notNull()
                      .as('owner')
                  )
              )
                .$notNull()
                .as('challenge')
            )
        )
          .$notNull()
          .as('game')
      )
      .execute();
    return games.map((game) => GameRepository.selectToGameOfUser(game));
  }

  static selectToGame(
    game: Select<'game'> & { host: Select<'user'> } & {
      challenge: Select<'challenge'> & { owner: Select<'user'>; test_cases: Select<'test_case'>[] };
    }
  ): Game {
    return {
      id: game.id,
      host: UserRepository.selectToUser(game.host),
      challenge: ChallengeRepository.selectToGameChallenge(game.challenge),
      maxPlayers: game.max_players,
      allowedLanguages: game.allowed_languages as string[],
      duration: game.duration,
      endedAt: game.ended_at ?? undefined,
    };
  }

  static selectToGameOfUser(
    gameUser: Select<'game_user'> & {
      game: Select<'game'> & { host: Select<'user'> } & {
        challenge: Select<'challenge'> & {
          owner: Select<'user'>;
          test_cases: Select<'test_case'>[];
        };
      };
    }
  ): GameOfUser {
    return {
      user: this.selectToGameUser(gameUser),
      game: this.selectToGame(gameUser.game),
    };
  }

  static selectToGameWithUserData(
    game: Select<'game'> & { host: Select<'user'> } & {
      challenge: Select<'challenge'> & { owner: Select<'user'>; test_cases: Select<'test_case'>[] };
    } & { users: Select<'game_user'>[] }
  ): GameWithUserData {
    return {
      game: this.selectToGame(game),
      users: game.users.map((user) => GameRepository.selectToGameUser(user)),
    };
  }

  static selectToGameUser(gameUser: Select<'game_user'>): GameOfUser['user'] {
    return {
      userId: gameUser.user_id,
      code: gameUser.code ?? undefined,
      language: gameUser.language ?? undefined,
      testsPassed: gameUser.tests_passed,
      showCode: gameUser.show_code,
      submittedAt: gameUser.submitted_at ?? undefined,
    };
  }
}
