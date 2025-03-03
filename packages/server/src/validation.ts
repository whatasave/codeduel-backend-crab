import { Value } from '@sinclair/typebox/value';
import type { Handler, RouteSchema, SchemaToRequest } from './routes';

export function handleWithValidation<Schema extends RouteSchema>(
  schema: Schema,
  handler: Handler<Schema>
): Handler {
  return async (request) => {
    const errors = [];

    for (const key in schema.request.query) {
      if (!request.query[key]) {
        errors.push(`Missing query parameter: ${key}`);
      }
      if (!Value.Check(schema.request.query[key]!, request.query[key])) {
        const errors = [];
        for (const error of Value.Errors(schema.request.query[key]!, request.query[key])) {
          errors.push(error.message);
        }
      }
    }

    if (schema.request.body && !Value.Check(schema.request.body, request.body)) {
      for (const error of Value.Errors(schema.request.body, request.body)) {
        errors.push(error.message);
      }
    }

    if (errors.length > 0) return { status: 400, body: errors };
    return await handler(request as SchemaToRequest<Schema['request']>);
  };
}
