import { describe, expect, it } from 'bun:test';
import { getIp } from './ip';

describe('getIp', () => {
  it('should return x-real-ip if present', () => {
    const headers = new Headers({ 'x-real-ip': '192.168.1.100' });
    expect(getIp(headers)).toBe('192.168.1.100');
  });

  it('should return trimmed x-real-ip if present', () => {
    const headers = new Headers({ 'x-real-ip': '  192.168.1.101  ' });
    expect(getIp(headers)).toBe('192.168.1.101');
  });

  it('should return the first IP from x-forwarded-for if x-real-ip is not present', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.45' });
    expect(getIp(headers)).toBe('203.0.113.45');
  });

  it('should return the trimmed first IP from x-forwarded-for with spaces', () => {
    const headers = new Headers({ 'x-forwarded-for': '  203.0.113.46  ' });
    expect(getIp(headers)).toBe('203.0.113.46');
  });

  it('should return the first IP from a list in x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.47, 192.168.1.1, 10.0.0.1' });
    expect(getIp(headers)).toBe('203.0.113.47');
  });

  it('should return the trimmed first IP from a list in x-forwarded-for with spaces', () => {
    const headers = new Headers({ 'x-forwarded-for': '  203.0.113.48  , 192.168.1.2' });
    expect(getIp(headers)).toBe('203.0.113.48');
  });

  it('should prioritize x-real-ip over x-forwarded-for', () => {
    const headers = new Headers({
      'x-real-ip': '198.51.100.10',
      'x-forwarded-for': '203.0.113.49, 192.168.1.3',
    });
    expect(getIp(headers)).toBe('198.51.100.10');
  });

  it('should return undefined for an empty Headers object', () => {
    const headers = new Headers();
    expect(getIp(headers)).toBeUndefined();
  });

  it('should return undefined if x-forwarded-for is an empty string', () => {
    const headers = new Headers({ 'x-forwarded-for': '' });
    expect(getIp(headers)).toBeUndefined();
  });

  it('should return undefined if x-forwarded-for starts with a comma', () => {
    const headers = new Headers({ 'x-forwarded-for': ',203.0.113.50' });
    expect(getIp(headers)).toBeUndefined();
  });

  it('should return undefined if x-forwarded-for contains only a comma', () => {
    const headers = new Headers({ 'x-forwarded-for': ',' });
    expect(getIp(headers)).toBeUndefined();
  });

  it('should return undefined if x-forwarded-for contains multiple leading commas', () => {
    const headers = new Headers({ 'x-forwarded-for': ',,,203.0.113.51' });
    expect(getIp(headers)).toBeUndefined();
  });

  it('should correctly parse x-forwarded-for with spaces around comma', () => {
    const headers = new Headers({ 'x-forwarded-for': '  203.0.113.52   ,  192.168.1.4  ' });
    expect(getIp(headers)).toBe('203.0.113.52');
  });

  it('should return undefined if the first part of x-forwarded-for is only whitespace', () => {
    const headers = new Headers({ 'x-forwarded-for': '   , 203.0.113.53' });
    expect(getIp(headers)).toBeUndefined();
  });

  it('should return undefined if x-forwarded-for is only whitespace', () => {
    const headers = new Headers({ 'x-forwarded-for': '   ' });
    expect(getIp(headers)).toBeUndefined();
  });

  it('should return undefined if x-real-ip is an empty string', () => {
    const headers = new Headers({ 'x-real-ip': '' });
    expect(getIp(headers)).toBeUndefined();
  });

  it('should return undefined if x-real-ip is only whitespace', () => {
    const headers = new Headers({ 'x-real-ip': '   ' });
    expect(getIp(headers)).toBeUndefined();
  });
});
