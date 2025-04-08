import type { User } from '../../user/data';
import type { UserService } from '../../user/service';
import type { Auth, Tokens } from '../data';
import type { AuthService } from '../service';
import type { Config } from './config';
import type { GithubAccessToken, GithubUserData } from './data';

export class GithubService {
  private static readonly PROVIDER: string = 'github';

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly config: Config
  ) {}

  public async create(user: GithubUserData): Promise<User | undefined> {
    const newUser = await this.userService.create({
      username: user.login,
      name: user.name ?? user.login,
      avatar: user.avatarUrl ?? undefined,
      biography: user.bio ?? undefined,
    });

    if (!newUser) return undefined;

    const auth = await this.authService.create({
      userId: newUser.id,
      provider: GithubService.PROVIDER,
      providerId: user.id,
    });

    if (!auth) {
      await this.userService.delete(newUser.id);
      return undefined;
    }

    return newUser;
  }

  public async byId(providerId: Auth['providerId']): Promise<Auth | undefined> {
    return await this.authService.byProvider(GithubService.PROVIDER, providerId);
  }

  public async userByProvider(providerId: Auth['providerId']): Promise<User | undefined> {
    const auth = await this.byId(providerId);
    if (!auth) return undefined;

    const authUser = await this.userService.findById(auth.userId);
    if (!authUser) return undefined;

    return authUser;
  }

  public async accessToken(code: string, state: string): Promise<GithubAccessToken | undefined> {
    try {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'User-Agent': 'codeduel.it/1.0',
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          state,
        }),
      });
      const data = (await response.json()) as unknown as GithubAccessToken;
      return data;
    } catch (e) {
      console.error('[ERROR]', e);
      return undefined;
    }
  }

  public async userData(accessToken: string): Promise<GithubUserData | undefined> {
    try {
      const response = await fetch('https://api.github.com/user', {
        method: 'GET',
        headers: {
          'User-Agent': 'codeduel.it/1.0',
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = (await response.json()) as unknown as GithubUserData;
      return data;
    } catch (e) {
      console.error('[ERROR]', e);
      return undefined;
    }
  }

  public async tokens(user: User): Promise<Tokens | undefined> {
    // const auth = await this.authService.byUser(user.id, GithubService.PROVIDER);
    // if (!auth) return undefined;
    // const token = await this.authService.tokenByUser(user.id, GithubService.PROVIDER);
    // if (!token) return undefined;
    // const refreshToken = await this.authService.refreshTokenByUser(user.id, GithubService.PROVIDER);
    // if (!refreshToken) return undefined;
    // const expiresIn = await this.authService.expiresInByUser(user.id, GithubService.PROVIDER);
    // if (!expiresIn) return undefined;
    // return {
    //   accessToken: token.accessToken,
    //   refreshToken: refreshToken.refreshToken,
    //   expiresIn: expiresIn.expiresIn,
    // };

    return undefined;
  }

  public createCookie(state: string): string {
    const cookieOptions = this.config.stateCookie;
    const cookie = [
      `${cookieOptions.name}=${state}`,
      cookieOptions.maxAge && `Max-Age=${cookieOptions.maxAge}`,
      cookieOptions.domain && `Domain=${cookieOptions.domain}`,
      cookieOptions.path && `Path=${cookieOptions.path}`,
      cookieOptions.httpOnly && 'HttpOnly',
      cookieOptions.secure && 'Secure',
      cookieOptions.sameSite && `SameSite=${cookieOptions.sameSite}`,
      'Path=',
    ].filter(Boolean);
    return cookie.join('; ');
  }

  public getState(cookie: string): string | undefined {
    if (!cookie.includes(this.config.stateCookie.name)) return undefined;
    const parsedCookies = cookie.split('; ').reduce((acc, curr) => {
      const [key, value] = curr.split('=');
      acc[key] = value;
      return acc;
    }, {});

    return parsedCookies[this.config.stateCookie.name];
  }

  public getAuthorizationUrl(state: string): string {
    const base = 'https://github.com/login/oauth/authorize';

    const query = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'read:user,user:email',
      state,
      allow_signup: 'false',
    });

    const url = new URL(base);
    url.search = query.toString();

    return url.toString();
  }
}
