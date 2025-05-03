import { Type, type Static } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';

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
  name: Type.String({ minLength: 1 }),
  value: Type.String(),
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

const CookieValidator = TypeCompiler.Compile(ResponseCookie);

export function createCookie(cookie: ResponseCookie): string {
  if (!CookieValidator.Check(cookie)) throw new Error('Invalid cookie object');

  const base: string[] = [`${encodeURIComponent(cookie.name)}=${encodeURIComponent(cookie.value)}`];

  const opts = [
    cookie.expires && `Expires=${new Date(cookie.expires).toUTCString()}`,
    cookie.maxAge && `Max-Age=${cookie.maxAge}`,
    cookie.domain && `Domain=${cookie.domain}`,
    cookie.path && `Path=${cookie.path}`,
    cookie.secure && 'Secure',
    cookie.httpOnly && 'HttpOnly',
    cookie.sameSite && `SameSite=${cookie.sameSite}`,
  ].filter(Boolean);

  return [base, ...opts].join('; ');
}

function parseCookie(cookieString: string): RequestCookie {
  const cookieTimmed = cookieString.trim();
  if (!cookieTimmed) throw new Error('Invalid cookie string');
  const [key, value] = cookieTimmed.split('=').map((p) => p.trim());
  if (!key) throw new Error('Invalid cookie string');

  return {
    name: decodeURIComponent(key),
    value: value ? decodeURIComponent(value) : undefined,
  };
}

export function parseCookies(cookiesString: string | null): RequestCookie[] {
  if (!cookiesString) return [];
  const cookies = cookiesString.split(';').map((cookie) => cookie.trim());
  return cookies.map(parseCookie);
}

export function getCookieValueByName(
  cookiesString: string | null,
  name: RequestCookie['name']
): string | undefined {
  const cookies = parseCookies(cookiesString);
  const cookie = cookies.find((cookie) => cookie.name === name);
  return cookie?.value;
}

export function removeCookie(name: RequestCookie['name']): string {
  return createCookie({ name, value: '', maxAge: -1, path: '/' });
}
