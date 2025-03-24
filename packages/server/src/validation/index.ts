import { AssertError, Value } from '@sinclair/typebox/value';
import type { Handler, Method, PathToParams, Route, RouteSchema, SchemaToRequest } from '../types';
import { Type, type StaticDecode, type TSchema } from '@sinclair/typebox';
import type { PathString } from '../router';

export function validation<Schema extends RouteSchema<Params>, Params extends string>(
  schema: Schema,
  handler: Handler<Schema>
): Handler {
  return async (request) => {
    const errors: string[] = [];

    const params = validate(Type.Object(schema.request.params ?? {}), request.params, errors);
    const query = validate(Type.Object(schema.request.query ?? {}), request.query, errors);
    const body = validate(schema.request.body ?? Type.Undefined(), request.body, errors);

    if (!params || !query || !body) return { status: 400, body: { errors } };
    return await handler({
      ...request,
      body,
      query,
      params,
    } as SchemaToRequest<Schema['request']>);
  };
}

function validate<Schema extends TSchema>(
  schema: Schema,
  value: unknown,
  errors: string[]
): StaticDecode<Schema> | undefined {
  try {
    return Value.Parse(schema, value);
  } catch (error) {
    if (error instanceof AssertError) {
      for (const { message } of error.Errors()) {
        errors.push(message);
      }
    }
    return undefined;
  }
}

export function validated<
  Schema extends RouteSchema<PathToParams<Path>>,
  Path extends PathString,
>(route: { method: Method; path: Path; schema: Schema; handler: Handler<Schema> }): Route {
  return { ...route, handler: validation(route.schema, route.handler) };
}
