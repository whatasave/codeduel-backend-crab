import { internalServerError, type Middleware } from '@codeduel-backend-crab/server';

export const defaultErrorHandler: Middleware = (route) => ({
  ...route,
  handler: async (request) => {
    try {
      return await route.handler(request);
    } catch {
      return internalServerError('Internal Server Error', {
        'Content-Type': 'text/plain',
      });
    }
  },
});

export const descriptiveErrorHandler: Middleware = (route) => ({
  ...route,
  handler: async (request) => {
    try {
      return await route.handler(request);
    } catch (error) {
      if (error instanceof Error) {
        return internalServerError(error.stack, {
          'Content-Type': 'text/plain',
        });
      }
      return internalServerError(String(error), {
        'Content-Type': 'text/plain',
      });
    }
  },
});
