import { createHmac, timingSafeEqual } from 'node:crypto';

import type { Logger } from '@codeduel-backend-crab/logger';
import { randomUUIDv7 } from 'bun';
import jwt, { type JwtPayload } from 'jsonwebtoken';

import type { Role } from '@/route/permission/data';
import type { PermissionService } from '@/route/permission/service';
import { UserNameAlreadyExistsError, type CreateUser, type User } from '@/route/user/data';
import { createCookie, removeCookie, type CookieOptions, type Cookies } from '@/utils/cookie';

import type { Config } from './config';
import type { CreateContext, SessionUser } from './data';
import {
  type AuthSession,
  type CreateAuthSession,
  stateValidator,
  type JwtAccessToken,
  type JwtRefreshToken,
  type Provider,
  type State,
} from './data';
import type { AuthRepository } from './repository';

export class AuthService {
  private userDefaultRoleId: Role['id'] | undefined;

  constructor(
    private readonly repository: AuthRepository,
    private readonly permissionsService: PermissionService,
    private readonly config: Config
  ) {}

  get accessTokenCookieOptions(): CookieOptions {
    return this.config.accessToken.cookie;
  }

  get refreshTokenCookieOptions(): CookieOptions {
    return this.config.refreshToken.cookie;
  }

  get csrfTokenCookieOptions(): CookieOptions {
    // The frontend must be able to read this cookie to send it back in the header.
    return { ...this.config.csrfToken.cookie, httpOnly: false };
  }

  get csrfTokenHeaderName(): string {
    return this.config.csrfToken.headerName;
  }

  /**
   * CSRF token bound to the session id (the refresh token jti, also carried by the access
   * token as `sid`): it changes on every refresh and a token planted by a third party
   * cannot match the victim's session.
   */
  csrfToken(sessionId: string): string {
    return createHmac('sha256', this.config.csrfToken.secret).update(sessionId).digest('base64url');
  }

  /**
   * Double-submit check: returns the submitted token only when the header and the cookie
   * are both present and equal.
   */
  submittedCsrfToken(headers: Headers, cookies: Cookies): string | undefined {
    const headerToken = headers.get(this.csrfTokenHeaderName);
    const cookieToken = cookies[this.csrfTokenCookieOptions.name];
    if (!headerToken || !cookieToken) return undefined;
    if (!safeEqual(headerToken, cookieToken)) return undefined;
    return headerToken;
  }

  isCsrfTokenBound(sessionId: string, token: string): boolean {
    return safeEqual(token, this.csrfToken(sessionId));
  }

  /** Full check: double-submit plus binding to the given session. */
  verifyCsrfRequest(headers: Headers, cookies: Cookies, sessionId: string): boolean {
    const token = this.submittedCsrfToken(headers, cookies);
    return token !== undefined && this.isCsrfTokenBound(sessionId, token);
  }

  sessionCookies(tokens: {
    accessToken: string;
    refreshToken: string;
    sessionId: string;
  }): string[] {
    return [
      createCookie({ ...this.accessTokenCookieOptions, value: tokens.accessToken }),
      createCookie({ ...this.refreshTokenCookieOptions, value: tokens.refreshToken }),
      createCookie({ ...this.csrfTokenCookieOptions, value: this.csrfToken(tokens.sessionId) }),
    ];
  }

  clearSessionCookies(): string[] {
    return [
      removeCookie(this.accessTokenCookieOptions),
      removeCookie(this.refreshTokenCookieOptions),
      removeCookie(this.csrfTokenCookieOptions),
    ];
  }

  async createIfNotExists(
    provider: Provider,
    user: CreateUser,
    logger?: Logger
  ): Promise<CreateContext> {
    const roleId = await this.getUserDefaultRoleId(logger);
    return await this.repository.createIfNotExists(provider, user, roleId, logger);
  }

  async createForce(provider: Provider, user: CreateUser, logger?: Logger): Promise<CreateContext> {
    try {
      return await this.createIfNotExists(provider, user, logger);
    } catch (error) {
      if (!(error instanceof UserNameAlreadyExistsError)) throw error;
      logger?.info(
        'createForce.usernameTaken',
        'username already exists, generating new one with random suffix',
        { username: user.username }
      );
      return await this.repository.create(
        provider,
        {
          ...user,
          username: `${user.username}-${randomUUIDv7()}`,
        },
        await this.getUserDefaultRoleId(logger),
        logger
      );
    }
  }

  accessToken(
    user: User,
    permissions: number[],
    sessionId: string,
    now: number = Date.now(),
    logger?: Logger
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.sign(
        {
          iss: this.config.jwt.issuer,
          aud: this.config.jwt.audience,
          exp: Math.floor(now / 1000) + this.config.accessToken.expiresIn,
          sub: user.id,

          username: user.username,
          permissions,
          sid: sessionId,
        } satisfies JwtAccessToken,
        this.config.accessToken.secret,
        { algorithm: 'HS256' },
        (err, token) => {
          if (err) {
            logger?.error('accessToken.signError', 'failed to sign access token', {
              error: logger.errorData(err),
            });
            return reject(err);
          }
          if (!token) return reject(new Error('Invalid token'));

          resolve(token);
        }
      );
    });
  }

  refreshToken(
    user: User,
    jti: string = randomUUIDv7('base64url'),
    now: number = Date.now(),
    logger?: Logger
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.sign(
        {
          iss: this.config.jwt.issuer,
          aud: this.config.jwt.audience,
          exp: Math.floor(now / 1000) + this.config.refreshToken.expiresIn,
          jti,
          sub: user.id,
        } satisfies JwtRefreshToken,
        this.config.refreshToken.secret,
        { algorithm: 'HS256' },
        (err, token) => {
          if (err) {
            logger?.error('refreshToken.signError', 'failed to sign refresh token', {
              error: logger.errorData(err),
            });
            return reject(err);
          }
          if (!token) return reject(new Error('Invalid token'));

          resolve(token);
        }
      );
    });
  }

  verifyAccessToken(token: string, logger?: Logger): Promise<JwtAccessToken> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        this.config.accessToken.secret,
        { algorithms: ['HS256'] },
        (err, decode) => {
          if (err) {
            logger?.debug('verifyAccessToken.invalid', 'invalid access token', {
              error: logger.errorData(err),
            });
            return reject(err);
          }

          if (decode === undefined) return reject(new Error('Invalid token'));
          const payload = decode as JwtPayload;

          if (payload.iss !== this.config.jwt.issuer)
            return reject(new Error('Invalid token issuer'));
          if (payload.aud !== this.config.jwt.audience)
            return reject(new Error('Invalid token audience'));
          if (typeof payload.exp !== 'number') return reject(new Error('Invalid token exp'));
          if (typeof payload.sub !== 'number') return reject(new Error('Invalid token sub'));
          if (typeof payload.username !== 'string')
            return reject(new Error('Invalid token username'));
          if (typeof payload.sid !== 'string') return reject(new Error('Invalid token sid'));

          resolve({
            iss: payload.iss,
            aud: payload.aud,
            exp: payload.exp,
            sub: payload.sub,
            username: payload.username,
            permissions: payload.permissions as number[],
            sid: payload.sid,
          });
        }
      );
    });
  }

  verifyRefreshToken(token: string, logger?: Logger): Promise<JwtRefreshToken> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        this.config.refreshToken.secret,
        { algorithms: ['HS256'] },
        (err, decode) => {
          if (err) {
            logger?.debug('verifyRefreshToken.invalid', 'invalid refresh token', {
              error: logger.errorData(err),
            });
            return reject(err);
          }

          if (decode === undefined) return reject(new Error('Invalid token'));
          const payload = decode as JwtPayload;

          if (payload.iss !== this.config.jwt.issuer)
            return reject(new Error('Invalid token issuer'));
          if (payload.aud !== this.config.jwt.audience)
            return reject(new Error('Invalid token audience'));
          if (typeof payload.exp !== 'number') return reject(new Error('Invalid token exp'));
          if (typeof payload.jti !== 'string') return reject(new Error('Invalid token jti'));
          if (typeof payload.sub !== 'number') return reject(new Error('Invalid token sub'));

          resolve({
            iss: payload.iss,
            aud: payload.aud,
            exp: payload.exp,
            jti: payload.jti,
            sub: payload.sub,
          });
        }
      );
    });
  }

  async verifySession(token: string, logger?: Logger): Promise<SessionUser> {
    const payload = await this.verifyAccessToken(token, logger);
    const permissions = await this.permissionsService.byIds(payload.permissions, logger);
    return {
      id: payload.sub,
      username: payload.username,
      permissions,
      sessionId: payload.sid,
    };
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

  async createSession(session: CreateAuthSession, logger?: Logger): Promise<AuthSession> {
    const newSession = await this.repository.createSession(session, logger);
    logger?.debug('createSession.success', 'new auth session created', {
      userId: session.userId,
      sessionId: newSession.id,
    });
    return newSession;
  }

  async updateSession(
    id: AuthSession['id'],
    tokenId: Exclude<AuthSession['tokenId'], undefined>,
    logger?: Logger
  ): Promise<void> {
    logger?.debug('updateSession.start', 'updating auth session token', {
      sessionId: id,
    });
    await this.repository.updateSession(id, tokenId);
  }

  async sessionByTokenId(
    tokenId: Exclude<AuthSession['tokenId'], undefined>
  ): Promise<AuthSession | undefined> {
    return await this.repository.sessionByTokenId(tokenId);
  }

  async deleteSession(id: AuthSession['id'], logger?: Logger): Promise<void> {
    logger?.debug('deleteSession.start', 'deleting auth session', { sessionId: id });
    return await this.repository.deleteSession(id);
  }

  async deleteSessionTokenId(
    tokenId: Exclude<AuthSession['tokenId'], undefined>,
    logger?: Logger
  ): Promise<void> {
    logger?.debug('deleteSessionTokenId.start', 'deleting auth session by token id');
    await this.repository.deleteSessionTokenId(tokenId);
  }

  private async getUserDefaultRoleId(logger?: Logger): Promise<Role['id']> {
    if (this.userDefaultRoleId !== undefined) return this.userDefaultRoleId;

    const role = await this.permissionsService.getRoleByName(this.config.userDefaultRole);
    if (!role) {
      logger?.error('defaultRole.notFound', 'configured default user role does not exist', {
        role: this.config.userDefaultRole,
      });
      throw new Error(`Default role "${this.config.userDefaultRole}" not found`);
    }

    this.userDefaultRoleId = role.id;
    return role.id;
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
