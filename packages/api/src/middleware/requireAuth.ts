import { unauthorized, type Middleware } from '@codeduel-backend-crab/server';
import type { JwtAccessToken } from '../route/auth/data';
import type { Config as AuthConfig } from '../route/auth/config';
import jwt, { type JwtPayload } from 'jsonwebtoken';

export const createRequireAuth = (config: AuthConfig): Middleware => {
  function verifyAccessToken(token: string): Promise<JwtAccessToken> {
    return new Promise((resolve, reject) => {
      jwt.verify(token, config.accessToken.secret, { algorithms: ['HS256'] }, (err, decode) => {
        if (err) return reject(err);

        if (!decode) return reject(new Error('Invalid token'));
        const payload = decode as JwtPayload;

        if (payload.iss !== config.jwt.issuer) return reject(new Error('Invalid token issuer'));
        if (payload.aud !== config.jwt.audience) return reject(new Error('Invalid token audience'));
        if (typeof payload.exp !== 'number') return reject(new Error('Invalid token exp'));
        if (typeof payload.sub !== 'number') return reject(new Error('Invalid token sub'));
        if (typeof payload.username !== 'string')
          return reject(new Error('Invalid token username'));

        resolve({
          iss: payload.iss,
          aud: payload.aud,
          exp: payload.exp,
          sub: payload.sub,
          username: payload.username,
        });
      });
    });
  }

  return (route) => ({
    ...route,
    handler: async (request) => {
      const token = request.headers.get('Authorization')?.split(' ')[1];
      if (!token) {
        return unauthorized('Missing token');
      }
      const user = await verifyAccessToken(token);
      request.user = {
        id: user.sub,
        username: user.username,
      };
      return await route.handler(request);
    },
  });
};
