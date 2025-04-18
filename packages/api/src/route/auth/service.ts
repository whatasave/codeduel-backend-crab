import type { User } from '../user/data';
import type { Auth, CreateAuth } from './data';
import type { AuthRepository } from './repository';
import jwt from 'jsonwebtoken';

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async create(newProvider: CreateAuth): Promise<Auth | undefined> {
    return await this.authRepository.create(newProvider);
  }

  async byProvider(
    provider: Auth['provider'],
    providerId: Auth['providerId']
  ): Promise<Auth | undefined> {
    return await this.authRepository.byProvider(provider, providerId);
  }

  async delete(userId: Auth['userId']): Promise<void> {
    await this.authRepository.delete(userId);
  }

  async accessToken(user: User): Promise<Auth | undefined> {
    // return await this.authRepository.byProvider(user.provider, user.providerId);
    const token = jwt.sign(
      {
        userId: user.id,
        provider: user.provider,
        providerId: user.providerId,
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
        data: 'foobar',
      },
      process.env.JWT_SECRET,
      {
        algorithm: 'RS256',
        expiresIn: '1h',
      },
      function (err, token) {
        console.log(token);
      }
    );

    return undefined;
  }

  async refreshToken(user: User): Promise<Auth | undefined> {
    return undefined;
  }

  async verifyToken(token: string): Promise<Auth | undefined> {
    return undefined;
  }
}
