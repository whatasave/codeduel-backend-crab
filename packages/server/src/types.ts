import type { Static, TSchema, TUndefined } from '@sinclair/typebox';
import type { PathString } from './router';

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

export interface Request<
  Query extends Record<string, unknown> = Record<string, unknown>,
  Params extends Record<string, string> = Record<string, string>,
  Body = unknown,
> {
  method: Method;
  path: string;
  query: Query;
  params: Params;
  body: Body;
  headers?: Headers;
}

export type Response<Status extends number = number, Body = unknown> = undefined extends Body
  ? {
      status: Status;
      body?: Body;
      headers?: Headers;
    }
  : {
      status: Status;
      body: Body;
      headers?: Headers;
    };

export type Handler<
  Schema extends RouteSchema = RouteSchema,
  Params extends Record<string, string> = Record<string, string>,
> = (
  request: SchemaToRequest<Expand<Schema['request']>, Params>
) => Promise<SchemaToResponse<Expand<Schema['response']>>>;

export interface Route {
  method?: Method;
  path?: PathString;
  schema?: RouteSchema;
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

export type PathToParams<Path extends PathString> = Expand<
  Path extends PathString
    ? Path extends `/${infer Param}/${infer Rest}`
      ? Param extends `:${infer ParamName}`
        ? Record<ParamName, string> & PathToParams<`/${Rest}`>
        : PathToParams<`/${Rest}`>
      : Path extends `/${infer Param}`
        ? Param extends `:${infer ParamName}`
          ? Record<ParamName, string>
          : Record<string, never>
        : Record<string, never>
    : never
>;

export type SchemaToRequest<
  Schema extends RequestSchema,
  Params extends Record<string, string> = Record<string, string>,
> = Request<
  UndefinedTo<Record<string, never>, Schema['query']> extends infer Query extends Record<
    string,
    TSchema
  >
    ? { [Key in keyof Query]: Static<Query[Key]> }
    : never,
  Params,
  Static<UndefinedTo<TUndefined, Schema['body']>>
>;

export type SchemaToResponse<Schema extends Record<number, TSchema>> = {
  [Status in keyof Schema]: Status extends number
    ? Response<Status, Static<Schema[Status]>>
    : never;
}[keyof Schema];

type UndefinedTo<E, T> = T extends T ? (undefined extends T ? E : T) : never;

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
