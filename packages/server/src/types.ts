import type {
  Static,
  StaticDecode,
  TNumber,
  TSchema,
  TString,
  TUndefined,
} from '@sinclair/typebox';
import type { PathString } from './router';

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

export interface Request<
  Query extends Record<string, unknown> = Record<string, unknown>,
  Params extends Record<string, string | number> = Record<string, string | number>,
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

export type Handler<Schema extends RouteSchema = RouteSchema> = (
  request: SchemaToRequest<Expand<Schema['request']>>
) => Promise<SchemaToResponse<Expand<Schema['response']>>>;

export interface Route {
  method?: Method;
  path?: PathString;
  schema?: RouteSchema;
  handler: Handler;
}

export interface RouteSchema<Params extends string = string> {
  request: RequestSchema<Params>;
  response: ResponseSchema;
}

export interface RequestSchema<Params extends string = string> {
  params?: Record<Params, TString | TNumber>;
  query?: Record<string, TSchema>;
  body?: TSchema;
}

export type ResponseSchema = Record<number, TSchema>;

export type PathToParams<Path extends PathString> = Expand<
  Path extends PathString
    ? Path extends `/${infer Param}/${infer Rest}`
      ? Param extends `:${infer ParamName}`
        ? ParamName | PathToParams<`/${Rest}`>
        : PathToParams<`/${Rest}`>
      : Path extends `/${infer Param}`
        ? Param extends `:${infer ParamName}`
          ? ParamName
          : string extends Param
            ? string
            : never
        : never
    : never
>;

export type SchemaToRequest<Schema extends RequestSchema> = Request<
  UndefinedTo<Record<string, never>, Schema['query']> extends infer Query extends Record<
    string,
    TSchema
  >
    ? { [Key in keyof Query]: StaticDecode<Query[Key]> }
    : Record<string, never>,
  UndefinedTo<Record<string, never>, Schema['params']> extends infer Params extends Record<
    string,
    TString | TNumber
  >
    ? { [Key in keyof Params]: StaticDecode<Params[Key]> }
    : Record<string, never>,
  StaticDecode<UndefinedTo<TUndefined, Schema['body']>>
>;

export type SchemaToResponse<Schema extends Record<number, TSchema>> = {
  [Status in keyof Schema]: Status extends number
    ? Response<Status, Static<Schema[Status]>>
    : never;
}[keyof Schema];

type UndefinedTo<E, T> = T extends T ? (undefined extends T ? E : T) : never;

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
