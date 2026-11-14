import type { Logger } from '@codeduel-backend-crab/logger';
import type { User } from '../user/data';
import type {
  CreateGame,
  Game,
  GameOfUser,
  GameWithUserData,
  ShareCode,
  UpdateGameUser,
} from './data';
import type { GameRepository } from './repository';

export class GameService {
  constructor(private readonly gameRepository: GameRepository) {}

  async byId(id: Game['id'], logger?: Logger): Promise<GameWithUserData | undefined> {
    const game = await this.gameRepository.byId(id);
    if (!game) logger?.debug('byId.notFound', 'game not found', { gameId: id });
    return game;
  }

  async create(createGame: CreateGame, logger?: Logger): Promise<GameWithUserData> {
    logger?.debug('create.start', 'creating game', {
      hostId: createGame.hostId,
      challengeId: createGame.challengeId,
      userCount: createGame.userIds.length,
    });
    const game = await this.gameRepository.create(createGame);
    logger?.info('create.success', 'game created', {
      gameId: game.game.id,
      hostId: createGame.hostId,
      challengeId: createGame.challengeId,
      userCount: game.users.length,
    });
    return game;
  }

  async updateSubmission(updateGameUser: UpdateGameUser, logger?: Logger): Promise<void> {
    const submittedAt = new Date().toISOString();
    await this.gameRepository.updateUser(updateGameUser, submittedAt);
    logger?.info('updateSubmission.success', 'game submission saved', {
      gameId: updateGameUser.gameId,
      userId: updateGameUser.userId,
      language: updateGameUser.language,
      testsPassed: updateGameUser.testsPassed,
    });
  }

  async shareCode(shareCode: ShareCode, logger?: Logger): Promise<void> {
    await this.gameRepository.shareCode(shareCode);
    logger?.info('shareCode.success', 'code sharing updated', {
      gameId: shareCode.gameId,
      userId: shareCode.userId,
      showCode: shareCode.showCode,
    });
  }

  async endGame(id: Game['id'], logger?: Logger): Promise<void> {
    await this.gameRepository.endGame(id);
    logger?.info('endGame.success', 'game ended', { gameId: id });
  }

  async byUserId(userId: User['id'], logger?: Logger): Promise<GameOfUser[]> {
    const games = await this.gameRepository.byUserId(userId);
    logger?.debug('byUserId.success', 'fetched games of user', { userId, count: games.length });
    return games;
  }
}
