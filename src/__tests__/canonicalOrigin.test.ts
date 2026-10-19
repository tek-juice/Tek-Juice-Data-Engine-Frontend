import { describe, expect, it } from 'vitest';
import { canonicalRedirect } from '../utils/canonicalOrigin';

const at = (href: string) => {
  const u = new URL(href);
  return { protocol: u.protocol, hostname: u.hostname, origin: u.origin, pathname: u.pathname, search: u.search, hash: u.hash };
};
const API = 'https://dataengine.54-86-109-228.sslip.io';

describe('canonicalRedirect', () => {
  it('sends the old http address to the HTTPS one, keeping the path', () => {
    expect(canonicalRedirect(API, at('http://54.86.109.228:9601/login?next=%2Fpagespeed')))
      .toBe('https://dataengine.54-86-109-228.sslip.io/login?next=%2Fpagespeed');
  });

  it('leaves the HTTPS address, local development and http APIs alone', () => {
    expect(canonicalRedirect(API, at('https://dataengine.54-86-109-228.sslip.io/login'))).toBeNull();
    expect(canonicalRedirect(API, at('http://localhost:5173/login'))).toBeNull();
    expect(canonicalRedirect('http://54.86.109.228:9600', at('http://54.86.109.228:9601/'))).toBeNull();
    expect(canonicalRedirect('', at('http://54.86.109.228:9601/'))).toBeNull();
  });
});
