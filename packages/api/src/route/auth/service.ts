import { type CookieOptions, createCookie } from '../../utils/cookie';
import type { CreateUser, User } from '../user/data';
import type { Config } from './config';
import type {
  AuthCookies,
  Authentication,
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

  async authenticate(user: CreateUser, provider: Provider): Promise<Authentication> {
    const [_, newUser] = await this.authRepository.createIfNotExists(user, provider);

    const tokens = await this.tokens(newUser);
    const cookies = this.createCookies(tokens);

    return { tokens, cookies };
  }

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

  async tokens(user: User): Promise<Tokens> {
    return { access: await this.accessToken(user), refresh: await this.refreshToken(user) };
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

  createCookie(key: string, value: string, options: CookieOptions): string {
    return createCookie(key, value, options);
  }

  createCookies(tokens: Tokens): AuthCookies {
    return {
      access: this.createCookie(
        this.config.accessToken.cookie.name,
        tokens.access,
        this.config.accessToken.cookie
      ),
      refresh: this.createCookie(
        this.config.refreshToken.cookie.name,
        tokens.refresh,
        this.config.accessToken.cookie
      ),
    };
  }
}
