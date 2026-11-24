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

function decodeCookiePart(part: string): string {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}

export function parseCookies(cookiesString: string | null): Cookies {
  const cookies: Cookies = Object.create(null) as Cookies;
  for (const part of cookiesString?.split(';') ?? []) {
    const separator = part.indexOf('=');
    const name = (separator === -1 ? part : part.slice(0, separator)).trim();
    if (!name) continue;
    const value = separator === -1 ? '' : part.slice(separator + 1).trim();
    cookies[decodeCookiePart(name)] = decodeCookiePart(value);
  }
  return cookies;
}

export function removeCookie(cookieOptions: CookieOptions): string {
  return createCookie({ ...cookieOptions, value: '', maxAge: -1 });
}
