import { describe, expect, test } from 'bun:test';

import { validateCookies, type Config } from './config';

describe('Route.Auth.Config', () => {
  const safeConfig = {
    accessToken: {
      cookie: { name: 'access_token', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' },
    },
    refreshToken: {
      cookie: {
        name: 'refresh_token',
        path: '/v1/auth',
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
      },
    },
    csrfToken: {
      secret: 'secret',
      headerName: 'X-CSRF-Token',
      cookie: { name: 'csrf_token', path: '/', httpOnly: false, secure: true, sameSite: 'Strict' },
    },
  } as Config;

  function withCookie(
    key: 'accessToken' | 'refreshToken' | 'csrfToken',
    cookie: Partial<Config['csrfToken']['cookie']>
  ): Config {
    return {
      ...safeConfig,
      [key]: { ...safeConfig[key], cookie: { ...safeConfig[key].cookie, ...cookie } },
    };
  }

  test('should accept safe cookie attributes', () => {
    expect(validateCookies(safeConfig)).toEqual([]);
  });

  test('should require an HttpOnly access token cookie', () => {
    expect(validateCookies(withCookie('accessToken', { httpOnly: false }))).toEqual([
      'accessToken.cookie: must be HttpOnly',
    ]);
  });

  test('should require an HttpOnly refresh token cookie', () => {
    expect(validateCookies(withCookie('refreshToken', { httpOnly: false }))).toEqual([
      'refreshToken.cookie: must be HttpOnly',
    ]);
    expect(validateCookies(withCookie('refreshToken', { httpOnly: undefined }))).toEqual([
      'refreshToken.cookie: must be HttpOnly',
    ]);
  });

  test('should require a csrf cookie readable by javascript on every path', () => {
    expect(validateCookies(withCookie('csrfToken', { httpOnly: true }))).toEqual([
      'csrfToken.cookie: must not be HttpOnly, the frontend has to read it',
    ]);
    expect(validateCookies(withCookie('csrfToken', { path: '/v1/auth' }))).toEqual([
      'csrfToken.cookie: path must be "/" so the frontend can read it',
    ]);
  });

  test('should require Secure with SameSite=None', () => {
    expect(validateCookies(withCookie('accessToken', { sameSite: 'None', secure: false }))).toEqual(
      ['accessToken.cookie: SameSite=None requires Secure']
    );
    expect(validateCookies(withCookie('csrfToken', { sameSite: 'None', secure: true }))).toEqual(
      []
    );
  });
});
