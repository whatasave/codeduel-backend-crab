import type { User } from '../user/data';
import type { Config } from './config';
import type { Auth, CreateAuth } from './data';
import type { AuthRepository } from './repository';
import jwt from 'jsonwebtoken';

export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly config: Config
  ) {}

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

  async tokens(user: User): Promise<{ accessToken: string; refreshToken: string } | undefined> {
    const accessToken = await this.accessToken(user);
    if (!accessToken) return undefined;

    const refreshToken = await this.refreshToken(user);
    if (!refreshToken) return undefined;

    return { accessToken, refreshToken };
  }

  async accessToken(user: User): Promise<string | undefined> {
    const token = jwt.sign(
      {
        iss: this.config.jwt.issuer,
        aud: this.config.jwt.audience,
        exp: Math.floor(Date.now() / 1000) + this.config.accessToken.expiresIn,
        sub: user.id,

        username: user.username,
        // perm: user.permissions, // TODO: add permissions
      },
      this.config.jwt.secret,
      { algorithm: 'HS256' }
    );

    return token;
  }

  async refreshToken(user: User): Promise<string | undefined> {
    const token = jwt.sign(
      {
        iss: this.config.jwt.issuer,
        aud: this.config.jwt.audience,
        exp: Math.floor(Date.now() / 1000) + this.config.refreshToken.expiresIn,
        sub: user.id,
      },
      this.config.jwt.secret,
      { algorithm: 'HS256' }
    );

    return token;
  }

  async verifyToken(token: string): Promise<Auth | undefined> {
    try {
      const decoded = jwt.verify(token, this.config.jwt.secret, {
        algorithms: ['HS256'],
      }) as Auth;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        console.error('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        console.error('Invalid token');
      } else {
        console.error('Token verification error', error);
      }
      return undefined;
    }
  }
}
