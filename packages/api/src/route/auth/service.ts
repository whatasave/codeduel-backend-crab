import { type CookieOptions, createCookie } from '../../utils/cookie';
import type { CreateUser, User } from '../user/data';
import type { UserService } from '../user/service';

import type { Config } from './config';
import type {
  Auth,
  AuthCookies,
  Authentication,
  CreateAuth,
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
    private readonly userService: UserService,
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

  accessToken(user: User): string | undefined {
    const token = jwt.sign(
      {
        iss: this.config.jwt.issuer,
        aud: this.config.jwt.audience,
        exp: Math.floor(Date.now() / 1000) + this.config.accessToken.expiresIn,
        sub: user.id,

        username: user.username,
        // perm: user.permissions, // TODO: add permissions
      } as JwtAccessToken,
      this.config.jwt.secret,
      { algorithm: 'HS256' }
    );

    return token;
  }

  refreshToken(user: User): string | undefined {
    const token = jwt.sign(
      {
        iss: this.config.jwt.issuer,
        aud: this.config.jwt.audience,
        exp: Math.floor(Date.now() / 1000) + this.config.refreshToken.expiresIn,
        sub: user.id,
      } as JwtRefreshToken,
      this.config.jwt.secret,
      { algorithm: 'HS256' }
    );

    return token;
  }

  tokens(user: User): Tokens | undefined {
    const access = this.accessToken(user);
    if (!access) return undefined;

    const refresh = this.refreshToken(user);
    if (!refresh) return undefined;

    return { access, refresh };
  }

  async verifyToken(token: string): Promise<string | JwtPayload | undefined> {
    try {
      return jwt.verify(token, this.config.jwt.secret, { algorithms: ['HS256'] });
    } catch {
      return undefined;
    }
  }

  createCookie(key: string, value: string, options: CookieOptions): string {
    return createCookie(key, value, options);
  }

  createCookies(tokens: Tokens): AuthCookies | undefined {
    const access = this.createCookie(
      this.config.accessToken.cookie.name,
      tokens.access,
      this.config.accessToken.cookie
    );

    const refresh = this.createCookie(
      this.config.refreshToken.cookie.name,
      tokens.refresh,
      this.config.accessToken.cookie
    );

    return { access, refresh };
  }

  async authenticate(user: CreateUser, provider: Provider): Promise<Authentication | undefined> {
    const newUser = await this.userService.create(user);
    if (!newUser) return undefined;

    const newAuth = await this.create({
      userId: newUser.id,
      provider: provider.name,
      providerId: provider.userId,
    });

    if (!newAuth) {
      await this.userService.delete(newUser.id);
      return undefined;
    }

    const tokens = this.tokens(newUser);
    if (!tokens) return undefined;

    const cookies = this.createCookies(tokens);
    if (!cookies) return undefined;

    return { tokens, cookies };
  }
}
