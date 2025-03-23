import { Value } from '@sinclair/typebox/value';
import type { Handler, Method, PathToParams, Route, RouteSchema, SchemaToRequest } from '../types';
import { Type, type TSchema } from '@sinclair/typebox';
import type { PathString } from '../router';

export function validation<Schema extends RouteSchema, Path extends PathString = PathString>(
  schema: Schema,
  handler: Handler<Schema, PathToParams<Path>>
): Handler {
  return async (request) => {
    const errors: string[] = [];

    validate(Type.Object(schema.request.query ?? {}), request.query, errors);
    if (schema.request.body) validate(schema.request.body, request.body, errors);

    if (errors.length > 0) return { status: 400, body: { errors } };
    return await handler(request as SchemaToRequest<Schema['request'], PathToParams<Path>>);
  };
}

function validate(schema: TSchema, value: unknown, errors: string[]): void {
  if (!Value.Check(schema, value)) {
    for (const error of Value.Errors(schema, value)) {
      errors.push(`${error.path}: ${error.message}, Received: ${String(error.value)}`);
    }
  }
}

export function validated<Schema extends RouteSchema, Path extends PathString>(route: {
  method: Method;
  path: Path;
  schema: Schema;
  handler: Handler<Schema, PathToParams<Path>>;
}): Route {
  return { ...route, handler: validation(route.schema, route.handler) };
}
