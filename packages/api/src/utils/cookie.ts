import { Type, type Static } from '@sinclair/typebox';

export type CookieOptions = Static<typeof CookieOptions>;
export const CookieOptions = Type.Object({
  name: Type.String(),
  domain: Type.String(),
  path: Type.String({ default: '/' }),
  maxAge: Type.Number(),
  httpOnly: Type.Boolean(),
  secure: Type.Boolean(),
  sameSite: Type.String({
    default: 'Lax',
    enum: ['Strict', 'Lax', 'None'],
  }),
});

export function createCookie(name: string, value: string, options: Partial<CookieOptions>): string {
  const cookieOptions = [
    options.domain && `Domain=${options.domain}`,
    `Path=${options.path ?? '/'}`,
    options.maxAge && `Max-Age=${options.maxAge}`,
    options.httpOnly && 'HttpOnly',
    options.secure && 'Secure',
    `SameSite=${options.sameSite ?? 'Lax'}`,
  ];

  const filteredOptions = cookieOptions.filter(Boolean);
  const parsedOptions = filteredOptions.join('; ');

  return `${name}=${value}; ${parsedOptions}`;
}

export function getCookieValueByName(cookies: string, name: string): string | undefined {
  const cookieArray = cookies.split('; ');
  const cookie = cookieArray.find((cookie) => cookie.startsWith(`${name}=`));
  if (!cookie) return undefined;

  return cookie.split('=')[1];
}
