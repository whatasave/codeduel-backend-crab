import type { Method, Request } from './request';
import { type Static, type TSchema, type TUndefined } from '@sinclair/typebox';
import type { Response } from './response';

export type Handler<Schema extends RouteSchema = RouteSchema> = (
  request: SchemaToRequest<Schema['request']>
) => Promise<SchemaToResponse<Schema['response']>>;

export interface Routes<Schema extends RouteSchema = RouteSchema> {
  prefix?: string;
  routes: (Route<Schema> | Routes)[];
}

export interface Route<Schema extends RouteSchema = RouteSchema> {
  method: Method;
  path: string;
  schema: Schema;
  handler: (
    request: SchemaToRequest<Schema['request']>
  ) => Promise<SchemaToResponse<Schema['response']>>;
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
  Schema['query'] extends undefined
    ? Record<never, never>
    : Schema['query'] extends Record<string, TSchema>
      ? { [Key in keyof Schema['query']]: Static<Schema['query'][Key]> }
      : Schema['query'] extends (infer Query extends Record<string, TSchema>) | undefined
        ?
            | {
                [Key in keyof Query]: Static<Query[Key]>;
              }
            | Record<string, never>
        : Record<string, never>,
  Static<UndefinedTo<TUndefined, Schema['body']>>
>;

export type SchemaToResponse<Schema extends Record<number, TSchema>> = {
  [Status in keyof Schema]: Response<Status & number, Static<Schema[Status & number]>>;
}[keyof Schema];

type UndefinedTo<E, T> = T extends T ? (undefined extends T ? E : T) : never;

export function routes<Schema extends RouteSchema>(routes: Routes<Schema>): Routes<Schema> {
  return routes;
}

export function route<Schema extends RouteSchema>(route: Route<Schema>): Route<Schema> {
  return route;
}
