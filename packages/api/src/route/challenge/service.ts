import type {
  ChallengeWithUser,
  ChallengeWithUserAndTestCases,
  CreateChallenge,
  UpdateChallenge,
  Challenge,
} from './data';
import type { ChallengeRepository } from './repository';

export class ChallengeService {
  constructor(private readonly challengeRepository: ChallengeRepository) {}

  async byId(id: ChallengeWithUser['id']): Promise<ChallengeWithUserAndTestCases | undefined> {
    return await this.challengeRepository.byId(id);
  }

  async all(): Promise<ChallengeWithUser[]> {
    return await this.challengeRepository.all();
  }

  async create(challenge: CreateChallenge): Promise<Challenge | undefined> {
    return await this.challengeRepository.create(challenge);
  }

  async update(challenge: UpdateChallenge): Promise<Challenge | undefined> {
    return await this.challengeRepository.update(challenge);
  }

  async delete(id: ChallengeWithUser['id']): Promise<boolean> {
    return await this.challengeRepository.delete(id);
  }

  async random(): Promise<ChallengeWithUserAndTestCases | undefined> {
    return await this.challengeRepository.random();
  }
}
