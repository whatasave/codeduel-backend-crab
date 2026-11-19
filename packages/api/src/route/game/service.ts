import type { Logger } from '@codeduel-backend-crab/logger';
import type { User } from '../user/data';
import type {
  CreateGame,
  Game,
  GameRef,
  GameWithUserData,
  GameWithUsersData,
  UpdateSubmission,
} from './data';
import type { GameRepository } from './repository';

export class GameService {
  constructor(private readonly gameRepository: GameRepository) {}

  async all(logger?: Logger): Promise<GameWithUsersData[]> {
    const games = await this.gameRepository.all();
    logger?.debug('all.success', 'fetched games', { count: games.length });
    return games;
  }

  async byUniqueId(
    uniqueId: Game['uniqueId'],
    logger?: Logger
  ): Promise<GameWithUsersData | undefined> {
    const game = await this.gameRepository.byUniqueId(uniqueId);
    if (!game) logger?.debug('byUniqueId.notFound', 'game not found', { uniqueId });
    return game;
  }

  /** Returns `undefined` if a game with the same unique id already exists. */
  async create(createGame: CreateGame, logger?: Logger): Promise<GameWithUsersData | undefined> {
    const existing = await this.gameRepository.byUniqueId(createGame.uniqueId);
    if (existing) {
      logger?.warn('create.conflict', 'game already exists', { uniqueId: createGame.uniqueId });
      return undefined;
    }

    const game = await this.gameRepository.create({
      ...createGame,
      allowedLanguages: GameService.parseAllowedLanguages(createGame.allowedLanguages),
    });
    logger?.info('create.success', 'game created', {
      gameId: game.game.id,
      uniqueId: game.game.uniqueId,
      ownerId: createGame.ownerId,
      challengeId: game.game.challenge.id,
      userCount: game.userData.length,
    });
    return game;
  }

  async updateSubmission(
    uniqueId: Game['uniqueId'],
    submission: UpdateSubmission,
    logger?: Logger
  ): Promise<boolean> {
    const submittedAt = new Date().toISOString();
    const updated = await this.gameRepository.updateSubmission(uniqueId, submission, submittedAt);
    if (!updated) {
      logger?.debug('updateSubmission.notFound', 'game or player not found', {
        uniqueId,
        userId: submission.userId,
      });
      return false;
    }
    logger?.info('updateSubmission.success', 'game submission saved', {
      uniqueId,
      userId: submission.userId,
      language: submission.language,
      testsPassed: submission.testsPassed,
    });
    return true;
  }

  async shareCode(
    game: GameRef,
    userId: User['id'],
    showCode: boolean,
    logger?: Logger
  ): Promise<boolean> {
    const updated = await this.gameRepository.shareCode(game, userId, showCode);
    if (!updated) {
      logger?.debug('shareCode.notFound', 'game or player not found', { game, userId });
      return false;
    }
    logger?.info('shareCode.success', 'code sharing updated', { game, userId, showCode });
    return true;
  }

  async endGame(uniqueId: Game['uniqueId'], logger?: Logger): Promise<boolean> {
    const ended = await this.gameRepository.endGame(uniqueId);
    if (!ended) logger?.debug('endGame.notFound', 'game not found', { uniqueId });
    else logger?.info('endGame.success', 'game ended', { uniqueId });
    return ended;
  }

  async byUserId(userId: User['id'], logger?: Logger): Promise<GameWithUserData[]> {
    const games = await this.gameRepository.byUserId(userId);
    logger?.debug('byUserId.success', 'fetched games of user', { userId, count: games.length });
    return games;
  }

  static parseAllowedLanguages(languages: CreateGame['allowedLanguages']): string[] {
    const list = typeof languages === 'string' ? languages.split(',') : languages;
    return list.map((language) => language.trim()).filter(Boolean);
  }
}
