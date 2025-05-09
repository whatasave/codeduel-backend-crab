import type { Challenge, ChallengeDetailed, CreateChallenge, UpdateChallenge } from './data';
import type { ChallengeRepository } from './repository';

export class ChallengeService {
  constructor(private readonly challengeRepository: ChallengeRepository) {}

  async byId(id: Challenge['id']): Promise<ChallengeDetailed | undefined> {
    return await this.challengeRepository.byId(id);
  }

  async all(): Promise<Challenge[]> {
    return await this.challengeRepository.all();
  }

  async create(challenge: CreateChallenge): Promise<Challenge | undefined> {
    return await this.challengeRepository.create(challenge);
  }

  async update(challenge: UpdateChallenge): Promise<Challenge | undefined> {
    return await this.challengeRepository.update(challenge);
  }

  async delete(id: Challenge['id']): Promise<boolean> {
    return await this.challengeRepository.delete(id);
  }

  async random(): Promise<ChallengeDetailed | undefined> {
    return await this.challengeRepository.random();
  }
}
