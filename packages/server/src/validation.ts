import { Value } from '@sinclair/typebox/value';
import type { Handler, RouteSchema, SchemaToRequest } from './routes';

export function handleWithValidation<Schema extends RouteSchema>(
  schema: Schema,
  handler: Handler<Schema>
): Handler {
  return async (request) => {
    const errors = [];

    if (schema.request.query) {
      for (const [key, query] of Object.entries(schema.request.query)) {
        if (!request.query[key]) {
          errors.push(`Missing query parameter: ${key}`);
        }
        if (!Value.Check(query, request.query[key])) {
          for (const error of Value.Errors(query, request.query[key])) {
            errors.push(error.message);
          }
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
