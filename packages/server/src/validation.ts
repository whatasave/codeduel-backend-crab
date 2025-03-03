import { Value } from '@sinclair/typebox/value';
import type { Handler, RouteSchema, SchemaToRequest } from './routes';
import { Type, type TSchema } from '@sinclair/typebox';

export function handleWithValidation<Schema extends RouteSchema>(
  schema: Schema,
  handler: Handler<Schema>
): Handler {
  return async (request) => {
    const errors: string[] = [];

    validate(Type.Object(schema.request.query ?? {}), request.query, errors);
    validate(schema.request.body, request.body, errors);

    if (errors.length > 0) return { status: 400, body: errors };
    return await handler(request as SchemaToRequest<Schema['request']>);
  };
}

function validate(schema: TSchema | undefined, value: unknown, errors: string[]) {
  if (!schema) return;
  if (!Value.Check(schema, value)) {
    for (const error of Value.Errors(schema, value)) {
      errors.push(error.message);
    }
  }
}
