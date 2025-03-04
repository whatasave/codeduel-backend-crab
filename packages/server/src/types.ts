import type { Static, TSchema, TUndefined } from '@sinclair/typebox';

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

export type Request<
  Query extends Record<string, unknown> = Record<string, unknown>,
  Body = unknown,
> = Expand<
  {
    method: Method;
    path: string;
    headers?: Headers;
  } & (Query extends undefined ? { query?: Query } : { query: Query }) &
    (Body extends undefined ? { body?: Body } : { body: Body })
>;

export type Response<Status extends number = number, Body = unknown> = MakeUndefinedOptional<{
  status: Status;
  body: Body;
  headers?: Headers;
}>;

export type Handler<Schema extends RouteSchema = RouteSchema> = (
  request: SchemaToRequest<Expand<Schema['request']>>
) => Promise<SchemaToResponse<Expand<Schema['response']>>>;

export interface Route {
  method: Method;
  path: string;
  handler: Handler;
}

export interface RouteSchema {
  request: RequestSchema;
  response: ResponseSchema;
}

export interface RequestSchema {
  query?: Record<string, TSchema>;
  body?: TSchema;
}

export type ResponseSchema = Record<number, TSchema>;

export type SchemaToRequest<Schema extends RequestSchema> = Request<
  UndefinedTo<Record<string, never>, Schema['query']> extends infer Query extends Record<
    string,
    TSchema
  >
    ? { [Key in keyof Query]: Static<Query[Key]> }
    : never,
  Static<UndefinedTo<TUndefined, Schema['body']>>
>;

export type SchemaToResponse<Schema extends Record<number, TSchema>> = {
  [Status in keyof Schema]: Status extends number
    ? Response<Status, Static<Schema[Status]>>
    : never;
}[keyof Schema];

type UndefinedTo<E, T> = T extends T ? (undefined extends T ? E : T) : never;

type MakeUndefinedOptional<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]?: T[K];
} & {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
};

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
