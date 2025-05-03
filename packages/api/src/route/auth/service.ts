import { randomUUIDv7 } from 'bun';
import { createCookie } from '../../utils/cookie';
import { UserNameAlreadyExistsError, type CreateUser, type User } from '../user/data';
import type { Config } from './config';
import type {
  AuthCookies,
  AuthUser,
  JwtAccessToken,
  JwtRefreshToken,
  Provider,
  Tokens,
} from './data';
import type { AuthRepository } from './repository';
import jwt, { type JwtPayload } from 'jsonwebtoken';

export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly config: Config
  ) {}

  /**
   * Create a new user if it does not exist. If the user already exists, return the existing user.
   */
  async createIfNotExists(user: CreateUser, provider: Provider): Promise<AuthUser> {
    const [_, newUser] = await this.authRepository.createIfNotExists(user, provider);
    const tokens = await this.tokens(newUser);
    const cookies = this.createCookies(tokens);

    return { tokens, cookies };
  }

  /**
   * Create a new user. If the user already exists, create a new user with a random username.
   */
  async createForce(user: CreateUser, provider: Provider): Promise<AuthUser> {
    try {
      return await this.createIfNotExists(user, provider);
    } catch (error) {
      if (!(error instanceof UserNameAlreadyExistsError)) throw error;
      return await this.createIfNotExists(
        {
          ...user,
          username: `${user.username}-${randomUUIDv7()}`,
        },
        provider
      );
    }
  }

  /**
   * Create a access token for the user.
   */
  accessToken(user: User): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.sign(
        {
          iss: this.config.jwt.issuer,
          aud: this.config.jwt.audience,
          exp: Math.floor(Date.now() / 1000) + this.config.accessToken.expiresIn,
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

  /**
   * Create a refresh token for the user.
   */
  refreshToken(user: User): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.sign(
        {
          iss: this.config.jwt.issuer,
          aud: this.config.jwt.audience,
          exp: Math.floor(Date.now() / 1000) + this.config.refreshToken.expiresIn,
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

  /**
   * Create a pair of access and refresh tokens for the user.
   */
  async tokens(user: User): Promise<Tokens> {
    return { access: await this.accessToken(user), refresh: await this.refreshToken(user) };
  }

  /**
   * Verify the access or refresh token.
   */
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

  /**
   * Create a cookie for the access or refresh token.
   */
  createCookies(tokens: Tokens): AuthCookies {
    return {
      access: createCookie({
        ...this.config.accessToken.cookie,
        name: this.config.accessToken.cookie.name,
        value: tokens.access,
      }),
      refresh: createCookie({
        ...this.config.refreshToken.cookie,
        name: this.config.refreshToken.cookie.name,
        value: tokens.refresh,
      }),
    };
  }
}
