import { unauthorized, type Middleware, type Route } from '@codeduel-backend-crab/server';

export function checkRole(role: string): Middleware {
  return (route: Route) => ({
    ...route,
    handler: async (request) => {
      const { user } = request;
      if (!user) return unauthorized('Missing user');

      const { roles } = user;
      if (roles.length === 0) return unauthorized('Missing roles');
      if (!roles.includes(role)) return unauthorized('Missing role');

      return await route.handler(request);
    },
  });
}
