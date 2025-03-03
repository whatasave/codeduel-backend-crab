export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

export interface Request<
  Query extends Record<string, unknown> = Record<string, unknown>,
  Body = unknown,
> {
  method: Method;
  path: string;
  query: Query;
  headers: Headers;
  body: Body;
}
