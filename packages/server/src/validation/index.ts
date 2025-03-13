import { Value } from '@sinclair/typebox/value';
import type { Handler, Method, Route, RouteSchema, SchemaToRequest } from '../types';
import { Type, type TSchema } from '@sinclair/typebox';
import type { PathString } from '../router';

export function validation<Schema extends RouteSchema>(
  schema: Schema,
  handler: Handler<Schema>
): Handler {
  return async (request) => {
    const errors: string[] = [];

    validate(Type.Object(schema.request.query ?? {}), request.query, errors);
    validate(schema.request.body ?? Type.Undefined(), request.body, errors);

    if (errors.length > 0) return { status: 400, body: { errors } };
    return await handler(request as SchemaToRequest<Schema['request']>);
  };
}

function validate(schema: TSchema, value: unknown, errors: string[]): void {
  if (!Value.Check(schema, value)) {
    for (const error of Value.Errors(schema, value)) {
      errors.push(error.message);
    }
  }
}

export function validated<Schema extends RouteSchema>(route: {
  method: Method;
  path: PathString;
  schema: Schema;
  handler: Handler<Schema>;
}): Route {
  return { ...route, handler: validation(route.schema, route.handler) };
}
