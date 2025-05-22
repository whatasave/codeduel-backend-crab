import type { RouteSchema, TypeBoxGroup, ValidatedRouteOptions } from '@glass-cannon/typebox';

export function route<Context, NewContext, Schema extends RouteSchema>(
  options: ValidatedRouteOptions<Context, NewContext, Schema>
): (group: TypeBoxGroup<Context>) => void {
  return (group) => group.validatedRoute(options);
}
