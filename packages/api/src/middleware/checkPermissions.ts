import { unauthorized, type Middleware, type Route } from '@codeduel-backend-crab/server';

export function checkPermission(permission: string): Middleware {
  return (route: Route) => ({
    ...route,
    handler: async (request) => {
      const { user } = request;
      if (!user) return unauthorized('Missing user');

      const { permissions } = user;
      if (permissions.length === 0) return unauthorized('Missing permissions');
      if (!permissions.includes(permission)) return unauthorized('Missing permission');

      return await route.handler(request);
    },
  });
}
