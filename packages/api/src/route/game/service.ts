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

  async byId(id: Game['id']): Promise<GameWithUserData | undefined> {
    return await this.gameRepository.byId(id);
  }

  async create(createGame: CreateGame): Promise<GameWithUserData> {
    return await this.gameRepository.create(createGame);
  }

  async updateSubmission(updateGameUser: UpdateGameUser): Promise<void> {
    await this.gameRepository.updateUser(updateGameUser);
  }

  async shareCode(shareCode: ShareCode): Promise<void> {
    await this.gameRepository.shareCode(shareCode);
  }

  async endGame(id: Game['id']): Promise<void> {
    await this.gameRepository.endGame(id);
  }

  async byUserId(userId: User['id']): Promise<GameOfUser[]> {
    return await this.gameRepository.byUserId(userId);
  }
}
