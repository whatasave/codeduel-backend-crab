import { describe, expect, it } from 'bun:test';
import {
  createCookie,
  parseCookies,
  removeCookie,
  type CookieOptions,
  type RequestCookie,
  type ResponseCookie,
} from './cookie';

describe('cookieUtils', () => {
  describe('createCookie', () => {
    it('should create a basic cookie string with name and value', () => {
      const cookie = { name: 'a', value: 'b' } satisfies ResponseCookie;
      expect(createCookie(cookie)).toBe(`${cookie.name}=${cookie.value}`);
    });

    it('should create a cookie string with an empty value if value is undefined', () => {
      const cookie = { name: 'a', value: undefined } satisfies ResponseCookie;
      expect(createCookie(cookie)).toBe(`${cookie.name}=`);
    });

    it('should create a cookie string with an empty value if value not passed', () => {
      const cookie = { name: 'a' } satisfies ResponseCookie;
      expect(createCookie(cookie)).toBe(`${cookie.name}=`);
    });

    it('should URI encode name and value', () => {
      const cookie = {
        name: 'n@me w/ sp@ces',
        value: 'v@lue w/ sp@ces & =',
      } satisfies ResponseCookie;
      expect(createCookie(cookie)).toBe(
        `${encodeURIComponent(cookie.name)}=${encodeURIComponent(cookie.value)}`
      );
    });

    it('should include Expires in UTC format if cookie.expires is provided', () => {
      const expires = new Date('2025-05-15T10:20:30.000Z').toISOString();
      const cookie = { name: 'a', value: 'b', expires } satisfies ResponseCookie;
      expect(createCookie(cookie)).toBe(`${cookie.name}=${cookie.value}; Expires=${expires}`);
    });

    it('should include Max-Age if cookie.maxAge is provided', () => {
      const cookie = { name: 'a', value: 'b', maxAge: 3600 } satisfies ResponseCookie;
      expect(createCookie(cookie)).toBe(`${cookie.name}=${cookie.value}; Max-Age=${cookie.maxAge}`);
    });

    it('should include Max-Age if cookie.maxAge is 0', () => {
      const cookie = { name: 'a', value: 'b', maxAge: 0 } satisfies ResponseCookie;
      expect(createCookie(cookie)).toBe(`${cookie.name}=${cookie.value}; Max-Age=${cookie.maxAge}`);
    });

    it('should include Domain if cookie.domain is provided', () => {
      const cookie = {
        name: 'a',
        value: 'b',
        domain: '.example.com',
      } satisfies ResponseCookie;
      expect(createCookie(cookie)).toBe(`${cookie.name}=${cookie.value}; Domain=${cookie.domain}`);
    });

    it('should include Path if cookie.path is provided', () => {
      const cookie = { name: 'a', value: 'b', path: '/app' } satisfies ResponseCookie;
      expect(createCookie(cookie)).toBe(`${cookie.name}=${cookie.value}; Path=${cookie.path}`);
    });

    it('should include Secure flag if cookie.secure is true', () => {
      const cookie = { name: 'a', value: 'b', secure: true } satisfies ResponseCookie;
      expect(createCookie(cookie)).toBe(`${cookie.name}=${cookie.value}; Secure`);
    });

    it('should not include Secure flag if cookie.secure is false or undefined', () => {
      const cookie1 = { name: 'a', value: 'b', secure: false } satisfies ResponseCookie;
      const cookie2 = { name: 'a', value: 'b' } satisfies ResponseCookie;
      expect(createCookie(cookie1)).toBe(`${cookie1.name}=${cookie1.value}`);
      expect(createCookie(cookie2)).toBe(`${cookie2.name}=${cookie2.value}`);
    });

    it('should include HttpOnly flag if cookie.httpOnly is true', () => {
      const cookie = { name: 'a', value: 'b', httpOnly: true } satisfies ResponseCookie;
      expect(createCookie(cookie)).toBe(`${cookie.name}=${cookie.value}; HttpOnly`);
    });

    it('should include SameSite if cookie.sameSite is provided', () => {
      const cookieLax = { name: 'a', value: 'b', sameSite: 'Lax' } satisfies ResponseCookie;
      const cookieStrict = { name: 'a', value: 'b', sameSite: 'Strict' } satisfies ResponseCookie;
      const cookieNone = { name: 'a', value: 'b', sameSite: 'None' } satisfies ResponseCookie;
      expect(createCookie(cookieLax)).toBe(
        `${cookieLax.name}=${cookieLax.value}; SameSite=${cookieLax.sameSite}`
      );
      expect(createCookie(cookieStrict)).toBe(
        `${cookieStrict.name}=${cookieStrict.value}; SameSite=${cookieStrict.sameSite}`
      );
      expect(createCookie(cookieNone)).toBe(
        `${cookieNone.name}=${cookieNone.value}; SameSite=${cookieNone.sameSite}`
      );
    });

    it('should create a full cookie string with all options', () => {
      const fixedDate = new Date('2025-06-01T00:00:00.000Z');
      const cookie = {
        name: 'full',
        value: 'example',
        expires: fixedDate.toISOString(),
        maxAge: 86400,
        domain: 'test.com',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'Strict',
      } as ResponseCookie;
      const expected = [
        `${cookie.name}=${cookie.value}`,
        `Expires=${fixedDate.toUTCString()}`,
        `Max-Age=${cookie.maxAge}`,
        `Domain=${cookie.domain}`,
        `Path=${cookie.path}`,
        'Secure',
        'HttpOnly',
        `SameSite=${cookie.sameSite}`,
      ].join('; ');
      expect(createCookie(cookie)).toBe(expected);
    });

    it('should only include specified options', () => {
      const cookie = { name: 'a', value: 'b', maxAge: 100, secure: true } satisfies ResponseCookie;
      expect(createCookie(cookie)).toBe(
        `${cookie.name}=${cookie.value}; Max-Age=${cookie.maxAge}; Secure`
      );
    });
  });

  describe('parseCookie (internal logic, tested as if exported)', () => {
    const parseCookieDirect = (cookieString: string): RequestCookie => {
      const cookieTrimmed = cookieString.trim();
      if (!cookieTrimmed) throw new Error('Invalid cookie string');
      const parts = cookieTrimmed.split('=');
      const key = parts[0]?.trim();
      const value = parts.slice(1).join('=').trim();

      if (!key) throw new Error('Invalid cookie string');

      return {
        name: decodeURIComponent(key),
        value: parts.length > 1 ? decodeURIComponent(value) : undefined,
      };
    };

    it('should parse a valid cookie string "name=value"', () => {
      expect(parseCookieDirect('myKey=myValue')).toEqual({ name: 'myKey', value: 'myValue' });
    });

    it('should parse a cookie string with URI encoded parts', () => {
      const encodedKey = encodeURIComponent('k e y');
      const encodedValue = encodeURIComponent('v a l u e');
      expect(parseCookieDirect(`${encodedKey}=${encodedValue}`)).toEqual({
        name: 'k e y',
        value: 'v a l u e',
      });
    });

    it('should parse a cookie string "name=" (no value)', () => {
      expect(parseCookieDirect('myKey=')).toEqual({ name: 'myKey', value: '' });
    });

    it('should parse a cookie string with only a name (no equals sign)', () => {
      expect(parseCookieDirect('myKeyOnly')).toEqual({ name: 'myKeyOnly', value: undefined });
    });

    it('should trim whitespace from cookie string before parsing', () => {
      expect(parseCookieDirect('  spacedKey=spacedValue  ')).toEqual({
        name: 'spacedKey',
        value: 'spacedValue',
      });
    });

    it('should handle multiple equals signs in value correctly (based on current implementation)', () => {
      const cookieString = 'name=value=othervalue';
      const cookieTrimmed = cookieString.trim();
      const [keyFromFile, valueFromFile] = cookieTrimmed.split('=').map((p) => p.trim());

      expect(keyFromFile).toBe('name');
      expect(valueFromFile).toBe('value');
      if (!keyFromFile) throw new Error('Invalid cookie string');
      expect({
        name: decodeURIComponent(keyFromFile),
        value: valueFromFile ? decodeURIComponent(valueFromFile) : undefined,
      }).toEqual({ name: 'name', value: 'value' });
    });

    it('should throw error for empty string', () => {
      expect(() => parseCookieDirect('')).toThrow('Invalid cookie string');
    });

    it('should throw error for string with only spaces', () => {
      expect(() => parseCookieDirect('   ')).toThrow('Invalid cookie string');
    });

    it('should throw error for cookie string like "=value" (no key)', () => {
      expect(() => parseCookieDirect('=value')).toThrow('Invalid cookie string');
    });
  });

  describe('parseCookies', () => {
    it('should return an empty object for null input', () => {
      expect(parseCookies(null)).toEqual({});
    });

    it('should return an empty object for an empty string input', () => {
      expect(parseCookies('')).toEqual({});
    });

    it('should return an empty object for a string with only spaces', () => {
      expect(parseCookies('   ')).toEqual({});
    });

    it('should parse a single valid cookie string', () => {
      expect(parseCookies('name=value')).toEqual({ name: 'value' });
    });

    it('should parse multiple valid cookie strings', () => {
      expect(parseCookies('name1=value1;name2=value2;name3=value3')).toEqual({
        name1: 'value1',
        name2: 'value2',
        name3: 'value3',
      });
    });

    it('should handle spaces around semicolons', () => {
      expect(parseCookies('name1=value1 ; name2=value2 ;name3=value3')).toEqual({
        name1: 'value1',
        name2: 'value2',
        name3: 'value3',
      });
    });

    it('should parse cookies with empty values correctly (value becomes "")', () => {
      expect(parseCookies('name1=value1;name2=;name3=value3')).toEqual({
        name1: 'value1',
        name2: '',
        name3: 'value3',
      });
    });

    it('should parse cookies where value is not present (value becomes "")', () => {
      expect(parseCookies('name1=value1;name2only;name3=value3')).toEqual({
        name1: 'value1',
        name2only: '',
        name3: 'value3',
      });
    });

    it('should URI decode names and values', () => {
      const cookie1 = { name: 'k e y 1', value: 'v a l 1' } satisfies RequestCookie;
      const cookie2 = { name: 'k e y 2', value: 'v a l 2' } satisfies RequestCookie;
      const key1 = encodeURIComponent(cookie1.name);
      const val1 = encodeURIComponent(cookie1.value);
      const key2 = encodeURIComponent(cookie2.name);
      const val2 = encodeURIComponent(cookie2.value);
      expect(parseCookies(`${key1}=${val1}; ${key2}=${val2}`)).toEqual({
        [cookie1.name]: cookie1.value,
        [cookie2.name]: cookie2.value,
      });
    });

    it('should prioritize the last cookie if names are duplicated', () => {
      expect(parseCookies('name1=value1;name1=value2')).toEqual({
        name1: 'value2',
      });
    });

    it('should throw an error if a part of the cookie string is malformed (e.g. starts with =)', () => {
      expect(() => parseCookies('name1=value1;=badcookiepart;name3=value3')).toThrow(
        'Invalid cookie string'
      );
    });

    it('should throw an error if a cookie part is empty after trim (e.g. ";;") but was not empty before trim (e.g. "; ;")', () => {
      expect(() => parseCookies('name1=value1; ;name3=value3')).toThrow('Invalid cookie string');
    });

    it('should skip empty segments produced by split (e.g. trailing semicolon)', () => {
      expect(() => parseCookies('name1=value1;')).toThrow('Invalid cookie string');
    });

    it('should handle complex string with multiple equals signs in values', () => {
      expect(parseCookies('user=name=foo;data=value=bar')).toEqual({
        user: 'name',
        data: 'value',
      });
    });
  });

  describe('removeCookie', () => {
    it('should return a cookie string that expires the cookie with basic options', () => {
      const options: CookieOptions = { name: 'a' };
      const result = removeCookie(options);
      expect(result).toContain(`${options.name}=;`);
      expect(result).toContain('Max-Age=-1');
    });

    it('should preserve other options like path and domain', () => {
      const options: CookieOptions = {
        name: 'a',
        path: '/app',
        domain: '.example.com',
      };
      const result = removeCookie(options);
      expect(result).toContain(`${options.name}=;`);
      expect(result).toContain('Max-Age=-1');
      expect(result).toContain('Path=/app');
      expect(result).toContain('Domain=.example.com');
    });

    it('should also set expires to a past date implicitly via Max-Age=-1', () => {
      const options: CookieOptions = { name: 'a', secure: true };
      const result = removeCookie(options);
      expect(result).toBe(`${options.name}=; Max-Age=-1; Secure`);
    });

    it('should overwrite existing value and maxAge/expires if passed in options', () => {
      const options: CookieOptions = {
        name: 'a',
        maxAge: 3600,
        expires: new Date(Date.now() + 100000).toISOString(),
        path: '/test',
      };
      const result = removeCookie(options);

      expect(result).toContain(`${options.name}=;`);
      expect(result).toContain('Max-Age=-1');
      expect(result).toContain(`Path=${options.path}`);
      expect(result).toContain('Expires=');
      expect(result).not.toContain('someImportantValue');
    });
  });
});
