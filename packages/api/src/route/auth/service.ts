import { randomUUIDv7 } from 'bun';
import { UserNameAlreadyExistsError, type CreateUser, type User } from '../user/data';
import {
  stateValidator,
  type Auth,
  type JwtAccessToken,
  type JwtRefreshToken,
  type Provider,
  type State,
} from './data';
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
        this.config.accessToken.secret,
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
        this.config.refreshToken.secret,
        { algorithm: 'HS256' },
        (err, token) => {
          if (err) return reject(err);
          if (!token) return reject(new Error('Invalid token'));

          resolve(token);
        }
      );
    });
  }

  async verifyAccessToken(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        this.config.accessToken.secret,
        { algorithms: ['HS256'] },
        (err, decode) => {
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
        }
      );
    });
  }

  async verifyRefreshToken(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        this.config.refreshToken.secret,
        { algorithms: ['HS256'] },
        (err, decode) => {
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
        }
      );
    });
  }

  encodeState(state: State): string {
    const jsonState = JSON.stringify(state);
    const buffer = Buffer.from(jsonState, 'utf-8');
    const base64State = buffer.toString('base64url');

    return base64State;
  }

  decodeState(state: string): State {
    const buffer = Buffer.from(state, 'base64url');
    const jsonState = buffer.toString('utf-8');
    const parsedState = stateValidator.Decode(JSON.parse(jsonState));

    return parsedState;
  }
}
