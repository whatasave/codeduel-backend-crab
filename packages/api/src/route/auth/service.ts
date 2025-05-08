import { randomUUIDv7 } from 'bun';
import { UserNameAlreadyExistsError, type CreateUser, type User } from '../user/data';
import type { Auth, JwtAccessToken, JwtRefreshToken, Provider } from './data';
import type { AuthRepository } from './repository';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { Config } from './config';
import type { CookieOptions } from '../../utils/cookie';

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly config: Config
  ) {}

  get accessTokenCookieOptions(): CookieOptions {
    return this.config.accessToken.cookie;
  }

  get refreshTokenCookieOptions(): CookieOptions {
    return this.config.refreshToken.cookie;
  }

  async createIfNotExists(provider: Provider, user: CreateUser): Promise<[Auth, User]> {
    return await this.repository.createIfNotExists(provider, user);
  }

  async createForce(provider: Provider, user: CreateUser): Promise<[Auth, User]> {
    try {
      return await this.createIfNotExists(provider, user);
    } catch (error) {
      if (!(error instanceof UserNameAlreadyExistsError)) throw error;
      return await this.repository.create(provider, {
        ...user,
        username: `${user.username}-${randomUUIDv7()}`,
      });
    }
  }

  accessToken(user: User, now: number = Date.now()): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.sign(
        {
          iss: this.config.jwt.issuer,
          aud: this.config.jwt.audience,
          exp: Math.floor(now / 1000) + this.config.accessToken.expiresIn,
          sub: user.id,

          username: user.username,
        } as JwtAccessToken,
        this.config.jwt.secret,
        { algorithm: 'HS256' },
        (err, token) => {
          if (err) return reject(err);
          if (!token) return reject(new Error('Invalid token'));

          resolve(token);
        }
      );
    });
  }

  refreshToken(user: User, now: number = Date.now()): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.sign(
        {
          iss: this.config.jwt.issuer,
          aud: this.config.jwt.audience,
          exp: Math.floor(now / 1000) + this.config.refreshToken.expiresIn,
          sub: user.id,
        } as JwtRefreshToken,
        this.config.jwt.secret,
        { algorithm: 'HS256' },
        (err, token) => {
          if (err) return reject(err);
          if (!token) return reject(new Error('Invalid token'));

          resolve(token);
        }
      );
    });
  }

  async verify(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      jwt.verify(token, this.config.jwt.secret, { algorithms: ['HS256'] }, (err, decode) => {
        if (err) return reject(err);

        if (!decode) return reject(new Error('Invalid token'));
        const payload = decode as JwtPayload;

        if (payload.aud !== this.config.jwt.audience) {
          return reject(new Error('Invalid token audience'));
        }
        if (payload.iss !== this.config.jwt.issuer) {
          return reject(new Error('Invalid token issuer'));
        }

        resolve();
      });
    });
  }

  state(state: string): string {
    const nonce = randomUUIDv7('base64url');
    return nonce + encodeURIComponent(state);
  }

  parseState(state: string): { nonce: string; state: string } {
    const nonce = state.slice(0, 22);
    const decodedState = decodeURIComponent(state.slice(22));
    return { nonce, state: decodedState };
  }
}
