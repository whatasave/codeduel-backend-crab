import { randomUUIDv7 } from 'bun';
import { UserNameAlreadyExistsError, type CreateUser, type User } from '../user/data';
import type { JwtAccessToken, JwtRefreshToken, Provider, Tokens } from './data';
import type { AuthRepository } from './repository';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { Type, type Static } from '@sinclair/typebox';

export type AuthServiceConfig = Static<typeof AuthServiceConfig>;
export const AuthServiceConfig = Type.Object({
  jwt: Type.Object({
    secret: Type.String(),
    issuer: Type.String(),
    audience: Type.String(),
  }),
  accessToken: Type.Object({
    expiresIn: Type.Number(),
  }),
  refreshToken: Type.Object({
    expiresIn: Type.Number(),
  }),
});

export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly config: AuthServiceConfig
  ) {}

  /**
   * Create a new user if it does not exist. If the user already exists, return the existing user.
   */
  async createIfNotExists(user: CreateUser, provider: Provider): Promise<Tokens> {
    const [_, newUser] = await this.authRepository.createIfNotExists(user, provider);
    return await this.generateTokens(newUser);
  }

  /**
   * Create a new user. If the user already exists, create a new user with a random username.
   */
  async createForce(user: CreateUser, provider: Provider): Promise<Tokens> {
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
  generateAccessToken(user: User, now: number = Date.now()): Promise<string> {
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

  /**
   * Create a refresh token for the user.
   */
  generateRefreshToken(user: User, now: number = Date.now()): Promise<string> {
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

  /**
   * Create a pair of access and refresh tokens for the user.
   */
  async generateTokens(user: User): Promise<Tokens> {
    const now = Date.now();

    const [access, refresh] = await Promise.all([
      this.generateAccessToken(user, now),
      this.generateRefreshToken(user, now),
    ]);

    return { access, refresh };
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
}
