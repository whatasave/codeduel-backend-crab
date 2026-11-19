import {
  jsonArrayFrom,
  jsonObjectFrom,
  sql,
  type Database,
  type Select,
} from '@codeduel-backend-crab/database';
import {
  DEFAULT_MODE,
  type CreateGame,
  type Game,
  type GameRef,
  type GameWithUserData,
  type GameWithUsersData,
  type UpdateSubmission,
  type UserData,
} from './data';
import type { User } from '../user/data';
import { UserRepository } from '../user/repository';
import { ChallengeRepository } from '../challenge/repository';

export type NewGame = Omit<CreateGame, 'allowedLanguages'> & { allowedLanguages: string[] };

type SelectGame = Select<'game'> & {
  challenge: Select<'challenge'> & {
    owner: Select<'user'>;
    test_case_count: number | string | null;
  };
  users: (Select<'game_user'> & { user: Select<'user'> })[];
};

export class GameRepository {
  constructor(private readonly db: Database) {}

  async all(): Promise<GameWithUsersData[]> {
    const games = await this.findGames({});
    return games.map((game) => GameRepository.selectToGameWithUsersData(game));
  }

  async byUniqueId(uniqueId: Game['uniqueId']): Promise<GameWithUsersData | undefined> {
    const [game] = await this.findGames({ uniqueId });
    return game && GameRepository.selectToGameWithUsersData(game);
  }

  async byUserId(userId: User['id']): Promise<GameWithUserData[]> {
    const games = await this.findGames({ userId });

    return games.map((row) => {
      const { game, userData } = GameRepository.selectToGameWithUsersData(row);
      const user = userData.find((data) => data.user.id === userId);
      if (!user) throw new Error('User not found in game');
      return { game, userData: user };
    });
  }

  async create(newGame: NewGame): Promise<GameWithUsersData> {
    return await this.db.transaction().execute(async (tx) => {
      const created = await tx
        .insertInto('game')
        .values((eb) => ({
          unique_id: newGame.uniqueId,
          host_id: newGame.ownerId,
          challenge_id:
            newGame.challengeId ??
            eb
              .selectFrom('challenge')
              .orderBy(sql`RANDOM()`)
              .limit(1)
              .select('id'),
          max_players: newGame.maxPlayers,
          allowed_languages: JSON.stringify(newGame.allowedLanguages),
          duration: newGame.gameDuration,
          ended_at: newGame.ended ? new Date().toISOString() : null,
        }))
        .returning('id')
        .executeTakeFirstOrThrow();

      await tx
        .insertInto('game_user')
        .values(
          [...new Set(newGame.users)].map((userId) => ({
            game_id: created.id,
            user_id: userId,
          }))
        )
        .execute();

      const game = await new GameRepository(tx).byUniqueId(newGame.uniqueId);
      if (!game) throw new Error('Game not found after creation');

      return game;
    });
  }

  async updateSubmission(
    uniqueId: Game['uniqueId'],
    submission: UpdateSubmission,
    submittedAt: string
  ): Promise<boolean> {
    const result = await this.db
      .updateTable('game_user')
      .where('user_id', '=', submission.userId)
      .where('game_id', '=', (eb) =>
        eb.selectFrom('game').where('unique_id', '=', uniqueId).select('id')
      )
      .set({
        code: submission.code,
        language: submission.language,
        tests_passed: submission.testsPassed,
        submitted_at: submittedAt,
      })
      .executeTakeFirst();
    return result.numUpdatedRows > 0;
  }

  async endGame(uniqueId: Game['uniqueId']): Promise<boolean> {
    const result = await this.db
      .updateTable('game')
      .where('unique_id', '=', uniqueId)
      .set({ ended_at: sql`COALESCE(ended_at, CURRENT_TIMESTAMP)` })
      .executeTakeFirst();
    return result.numUpdatedRows > 0;
  }

  async shareCode(game: GameRef, userId: User['id'], showCode: boolean): Promise<boolean> {
    const result = await this.db
      .updateTable('game_user')
      .where('user_id', '=', userId)
      .where('game_id', '=', (eb) =>
        eb
          .selectFrom('game')
          .where(typeof game === 'number' ? 'id' : 'unique_id', '=', game)
          .select('id')
      )
      .set({ show_code: showCode })
      .executeTakeFirst();
    return result.numUpdatedRows > 0;
  }

  /** Finds the games (newest first) with their challenge and players. */
  private async findGames(filter: {
    uniqueId?: Game['uniqueId'];
    userId?: User['id'];
  }): Promise<SelectGame[]> {
    const { uniqueId, userId } = filter;
    return await this.db
      .selectFrom('game')
      .$if(uniqueId !== undefined, (qb) => qb.where('game.unique_id', '=', uniqueId ?? ''))
      .$if(userId !== undefined, (qb) =>
        qb.where('game.id', 'in', (eb) =>
          eb
            .selectFrom('game_user')
            .where('game_user.user_id', '=', userId ?? -1)
            .select('game_user.game_id')
        )
      )
      .orderBy('game.id', 'desc')
      .selectAll('game')
      .select((eb) =>
        jsonObjectFrom(
          eb
            .selectFrom('challenge')
            .whereRef('challenge.id', '=', 'game.challenge_id')
            .selectAll('challenge')
            .select((eb) =>
              jsonObjectFrom(
                eb
                  .selectFrom('user')
                  .whereRef('user.id', '=', 'challenge.owner_id')
                  .selectAll('user')
              )
                .$notNull()
                .as('owner')
            )
            .select((eb) =>
              eb
                .selectFrom('test_case')
                .whereRef('test_case.challenge_id', '=', 'challenge.id')
                .select(sql<number>`count(*)::int`.as('count'))
                .as('test_case_count')
            )
        )
          .$notNull()
          .as('challenge')
      )
      .select((eb) =>
        jsonArrayFrom(
          eb
            .selectFrom('game_user')
            .whereRef('game_user.game_id', '=', 'game.id')
            .orderBy('game_user.user_id')
            .selectAll('game_user')
            .select((eb) =>
              jsonObjectFrom(
                eb
                  .selectFrom('user')
                  .whereRef('user.id', '=', 'game_user.user_id')
                  .selectAll('user')
              )
                .$notNull()
                .as('user')
            )
        ).as('users')
      )
      .execute();
  }

  static selectToGameWithUsersData(game: SelectGame): GameWithUsersData {
    return {
      game: GameRepository.selectToGame(game),
      userData: game.users.map((user) => GameRepository.selectToUserData(user)),
    };
  }

  static selectToGame(game: Omit<SelectGame, 'users'>): Game {
    return {
      id: game.id,
      uniqueId: game.unique_id,
      challenge: ChallengeRepository.selectToChallengeSummary(game.challenge),
      ownerId: game.host_id,
      ended: game.ended_at !== null,
      mode: DEFAULT_MODE,
      maxPlayers: game.max_players,
      duration: game.duration,
      allowedLanguages: game.allowed_languages as string[],
      createdAt: game.created_at,
    };
  }

  static selectToUserData(gameUser: Select<'game_user'> & { user: Select<'user'> }): UserData {
    return {
      user: UserRepository.selectToUserListItem(gameUser.user),
      code: gameUser.code ?? undefined,
      language: gameUser.language ?? undefined,
      testsPassed: gameUser.tests_passed,
      submittedAt: gameUser.submitted_at ?? undefined,
      showCode: gameUser.show_code,
    };
  }
}
