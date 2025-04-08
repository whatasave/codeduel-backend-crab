import type { Auth, CreateAuth } from './data';
import type { AuthRepository } from './repository';

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  public async create(newProvider: CreateAuth): Promise<Auth | undefined> {
    return await this.authRepository.create(newProvider);
  }
  public async byProvider(
    provider: Auth['provider'],
    providerId: Auth['providerId']
  ): Promise<Auth | undefined> {
    return await this.authRepository.byProvider(provider, providerId);
  }
}
