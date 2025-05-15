import { Type, type Static } from '@sinclair/typebox';

export type CookieOptions = Static<typeof CookieOptions>;
export const CookieOptions = Type.Object({
  name: Type.String({ minLength: 1 }),
  expires: Type.Optional(Type.String({ format: 'date-time' })),
  maxAge: Type.Optional(Type.Integer({ minimum: 0 })),
  domain: Type.Optional(Type.String({ minLength: 1 })),
  path: Type.Optional(Type.String({ minLength: 1 })),
  secure: Type.Optional(Type.Boolean()),
  httpOnly: Type.Optional(Type.Boolean()),
  sameSite: Type.Optional(
    Type.Union([Type.Literal('Strict'), Type.Literal('Lax'), Type.Literal('None')])
  ),
});

export type RequestCookie = Static<typeof RequestCookie>;
export const RequestCookie = Type.Object({
  name: Type.String({ minLength: 1 }),
  value: Type.Optional(Type.String()),
});

export type ResponseCookie = Static<typeof ResponseCookie>;
export const ResponseCookie = Type.Object({
  ...RequestCookie.properties,
  ...CookieOptions.properties,
});

export type Cookies = Static<typeof Cookies>;
export const Cookies = Type.Record(Type.String(), Type.String());

export function createCookie(cookie: ResponseCookie): string {
  const base: string[] = [
    `${encodeURIComponent(cookie.name)}=${encodeURIComponent(cookie.value ?? '')}`,
  ];

  const opts = [
    cookie.expires !== undefined && `Expires=${new Date(cookie.expires).toUTCString()}`,
    cookie.maxAge !== undefined && `Max-Age=${cookie.maxAge}`,
    cookie.domain !== undefined && `Domain=${cookie.domain}`,
    cookie.path !== undefined && `Path=${cookie.path}`,
    cookie.secure !== undefined && cookie.secure && 'Secure',
    cookie.httpOnly !== undefined && cookie.httpOnly && 'HttpOnly',
    cookie.sameSite !== undefined && `SameSite=${cookie.sameSite}`,
  ].filter(Boolean);

  return [base, ...opts].join('; ');
}

function parseCookie(cookieString: string): RequestCookie {
  const cookieTrimmed = cookieString.trim();
  if (!cookieTrimmed) throw new Error('Invalid cookie string');
  const [key, value] = cookieTrimmed.split('=').map((p) => p.trim());
  if (!key) throw new Error('Invalid cookie string');

  return {
    name: decodeURIComponent(key),
    value: value ? decodeURIComponent(value) : undefined,
  };
}

export function parseCookies(cookiesString: string | null): Cookies {
  const cookies: Cookies = {};
  const trimmedCookiesString = cookiesString?.trim();
  if (!trimmedCookiesString || trimmedCookiesString.length === 0) return cookies;

  for (const cookieString of trimmedCookiesString.trim().split(';')) {
    const cookie = parseCookie(cookieString);
    cookies[cookie.name] = cookie.value ?? '';
  }

  return cookies;
}

export function removeCookie(cookieOptions: CookieOptions): string {
  return createCookie({ ...cookieOptions, value: '', maxAge: -1 });
}
