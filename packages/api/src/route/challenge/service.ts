import type { Logger } from '@codeduel-backend-crab/logger';
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

  async byId(
    id: ChallengeWithUser['id'],
    logger?: Logger
  ): Promise<ChallengeWithUserAndTestCases | undefined> {
    const challenge = await this.challengeRepository.byId(id);
    if (!challenge) logger?.debug('byId.notFound', 'challenge not found', { challengeId: id });
    return challenge;
  }

  async all(logger?: Logger): Promise<ChallengeWithUser[]> {
    const challenges = await this.challengeRepository.all();
    logger?.debug('all.success', 'fetched challenges', { count: challenges.length });
    return challenges;
  }

  async create(challenge: CreateChallenge, logger?: Logger): Promise<Challenge | undefined> {
    const created = await this.challengeRepository.create(challenge);
    logger?.info('create.success', 'challenge created', {
      challengeId: created.id,
      ownerId: created.ownerId,
    });
    return created;
  }

  async update(challenge: UpdateChallenge, logger?: Logger): Promise<Challenge | undefined> {
    const updated = await this.challengeRepository.update(challenge);
    if (!updated) {
      logger?.debug('update.notFound', 'challenge to update not found', {
        challengeId: challenge.id,
      });
      return undefined;
    }
    logger?.info('update.success', 'challenge updated', { challengeId: updated.id });
    return updated;
  }

  async delete(id: ChallengeWithUser['id'], logger?: Logger): Promise<boolean> {
    const deleted = await this.challengeRepository.delete(id);
    if (deleted) logger?.info('delete.success', 'challenge deleted', { challengeId: id });
    else logger?.debug('delete.notFound', 'challenge to delete not found', { challengeId: id });
    return deleted;
  }

  async random(logger?: Logger): Promise<ChallengeWithUserAndTestCases | undefined> {
    const challenge = await this.challengeRepository.random();
    if (!challenge) logger?.warn('random.empty', 'no challenge available to pick from');
    else logger?.debug('random.success', 'picked random challenge', { challengeId: challenge.id });
    return challenge;
  }
}
