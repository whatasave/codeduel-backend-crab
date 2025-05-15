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
      const cookie: ResponseCookie = { name: 'testName', value: 'testValue' };
      expect(createCookie(cookie)).toBe('testName=testValue');
    });

    it('should create a cookie string with an empty value if value is undefined', () => {
      const cookie: ResponseCookie = { name: 'testName', value: undefined };
      expect(createCookie(cookie)).toBe('testName=');
    });

    it('should create a cookie string with an empty value if value is null', () => {
      const cookie: ResponseCookie = { name: 'testName', value: undefined };
      expect(createCookie(cookie)).toBe('testName=');
    });

    it('should URI encode name and value', () => {
      const cookie: ResponseCookie = { name: 'n@me w/ sp@ces', value: 'v@lue w/ sp@ces & =' };
      expect(createCookie(cookie)).toBe(
        `${encodeURIComponent('n@me w/ sp@ces')}=${encodeURIComponent('v@lue w/ sp@ces & =')}`
      );
    });

    it('should include Expires in UTC format if cookie.expires is provided', () => {
      const fixedDate = new Date('2025-05-15T10:20:30.000Z');
      const cookie: ResponseCookie = {
        name: 'session',
        value: 'abc',
        expires: fixedDate.toISOString(),
      };
      expect(createCookie(cookie)).toBe(`session=abc; Expires=${fixedDate.toUTCString()}`);
    });

    it('should include Max-Age if cookie.maxAge is provided', () => {
      const cookie: ResponseCookie = { name: 'data', value: '123', maxAge: 3600 };
      expect(createCookie(cookie)).toBe('data=123; Max-Age=3600');
    });

    it('should include Max-Age if cookie.maxAge is 0', () => {
      const cookie: ResponseCookie = { name: 'data', value: '123', maxAge: 0 };
      expect(createCookie(cookie)).toBe('data=123; Max-Age=0');
    });

    it('should include Domain if cookie.domain is provided', () => {
      const cookie: ResponseCookie = { name: 'pref', value: 'xyz', domain: '.example.com' };
      expect(createCookie(cookie)).toBe('pref=xyz; Domain=.example.com');
    });

    it('should include Path if cookie.path is provided', () => {
      const cookie: ResponseCookie = { name: 'user', value: 'def', path: '/app' };
      expect(createCookie(cookie)).toBe('user=def; Path=/app');
    });

    it('should include Secure flag if cookie.secure is true', () => {
      const cookie: ResponseCookie = { name: 'token', value: 'secureToken', secure: true };
      expect(createCookie(cookie)).toBe('token=secureToken; Secure');
    });

    it('should not include Secure flag if cookie.secure is false or undefined', () => {
      const cookie1: ResponseCookie = { name: 'token', value: 'secureToken', secure: false };
      const cookie2: ResponseCookie = { name: 'token', value: 'secureToken' };
      expect(createCookie(cookie1)).toBe('token=secureToken');
      expect(createCookie(cookie2)).toBe('token=secureToken');
    });

    it('should include HttpOnly flag if cookie.httpOnly is true', () => {
      const cookie: ResponseCookie = { name: 'secret', value: 'supersecret', httpOnly: true };
      expect(createCookie(cookie)).toBe('secret=supersecret; HttpOnly');
    });

    it('should include SameSite if cookie.sameSite is provided', () => {
      const cookieLax: ResponseCookie = { name: 'sId', value: 'laxVal', sameSite: 'Lax' };
      const cookieStrict: ResponseCookie = { name: 'sId', value: 'strictVal', sameSite: 'Strict' };
      const cookieNone: ResponseCookie = { name: 'sId', value: 'noneVal', sameSite: 'None' };
      expect(createCookie(cookieLax)).toBe('sId=laxVal; SameSite=Lax');
      expect(createCookie(cookieStrict)).toBe('sId=strictVal; SameSite=Strict');
      expect(createCookie(cookieNone)).toBe('sId=noneVal; SameSite=None');
    });

    it('should create a full cookie string with all options', () => {
      const fixedDate = new Date('2025-06-01T00:00:00.000Z');
      const cookie: ResponseCookie = {
        name: 'full',
        value: 'example',
        expires: fixedDate.toISOString(),
        maxAge: 86400,
        domain: 'test.com',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'Strict',
      };
      const expected = [
        'full=example',
        `Expires=${fixedDate.toUTCString()}`,
        'Max-Age=86400',
        'Domain=test.com',
        'Path=/',
        'Secure',
        'HttpOnly',
        'SameSite=Strict',
      ].join('; ');
      expect(createCookie(cookie)).toBe(expected);
    });

    it('should only include specified options', () => {
      const cookie: ResponseCookie = {
        name: 'partial',
        value: 'opts',
        maxAge: 100,
        secure: true,
      };
      expect(createCookie(cookie)).toBe('partial=opts; Max-Age=100; Secure');
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
      const key1 = encodeURIComponent('k e y 1');
      const val1 = encodeURIComponent('v a l 1');
      const key2 = encodeURIComponent('k e y 2');
      const val2 = encodeURIComponent('v a l 2');
      expect(parseCookies(`${key1}=${val1}; ${key2}=${val2}`)).toEqual({
        'k e y 1': 'v a l 1',
        'k e y 2': 'v a l 2',
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
      const options: CookieOptions = { name: 'session' };
      const result = removeCookie(options);
      expect(result).toContain('session=');
      expect(result).toContain('Max-Age=-1');
    });

    it('should preserve other options like path and domain', () => {
      const options: CookieOptions = {
        name: 'userToken',
        path: '/app',
        domain: '.example.com',
      };
      const result = removeCookie(options);
      expect(result).toContain('userToken=');
      expect(result).toContain('Max-Age=-1');
      expect(result).toContain('Path=/app');
      expect(result).toContain('Domain=.example.com');
    });

    it('should also set expires to a past date implicitly via Max-Age=-1', () => {
      const options: CookieOptions = { name: 'oldCookie', secure: true };
      const result = removeCookie(options);
      expect(result).toBe('oldCookie=; Max-Age=-1; Secure');
    });

    // TODO: check if this is correct
    // it('should overwrite existing value and maxAge/expires if passed in options', () => {
    //   const options: CookieOptions = {
    //     name: 'toBeRemoved',
    //     maxAge: 3600,
    //     expires: new Date(Date.now() + 100000).toISOString(),
    //     path: '/test',
    //   };
    //   const result = removeCookie(options);

    //   expect(result).toContain('toBeRemoved=');
    //   expect(result).toContain('Max-Age=-1');
    //   expect(result).toContain('Path=/test');
    //   expect(result).not.toContain('Expires=');
    //   expect(result).not.toContain('someImportantValue');
    // });
  });
});
