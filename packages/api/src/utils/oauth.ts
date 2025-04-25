import { randomUUIDv7 } from 'bun';

export function createOauthState(state: string): string {
  const nonce = randomUUIDv7('base64url');
  return nonce + encodeURIComponent(state);
}

export function parseOauthState(state: string): { nonce: string; state: string } {
  const nonce = state.slice(0, 22);
  const decodedState = decodeURIComponent(state.slice(22));
  return { nonce, state: decodedState };
}
