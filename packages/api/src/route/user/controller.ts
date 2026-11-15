import { Type } from '@sinclair/typebox';
import type { UserService } from './service';
import { User } from './data';
import type { AuthMiddleware } from '../auth/middleware';
import { route, routes, type NodeBuilder } from '@glass-cannon/router';
import { validated } from '@glass-cannon/typebox';
import type { Logger } from '@codeduel-backend-crab/logger';
import { loggerDecorator } from '../../middleware/logger';

export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authMiddleware: AuthMiddleware,
    private readonly logger: Logger
  ) {}

  setup(): NodeBuilder {
    return routes({ middleware: loggerDecorator(this.logger) })
      .use(this.users)
      .use(this.byId)
      .use(this.profile());
  }

  users = route<{ logger: Logger }>(
    validated({
      method: 'GET',
      path: '/',
      schema: {
        query: { username: Type.Optional(Type.String()) },
        response: {
          200: Type.Union([User, Type.Array(User)]),
          404: Type.Undefined(),
        },
      },
      handler: async ({ query, logger }) => {
        const { username } = query;
        if (!username) return { status: 200, body: await this.userService.all(logger) };

        const user = await this.userService.byUsername(username, logger);
        if (!user) return { status: 404 };
        return { status: 200, body: user };
      },
    })
  );

  byId = route<{ logger: Logger }>(
    validated({
      method: 'GET',
      path: '/:id',
      schema: {
        params: { id: Type.Number() },
        response: {
          200: User,
          404: Type.Undefined(),
        },
      },
      handler: async ({ params, logger }) => {
        const { id } = params;
        const user = await this.userService.byId(id, logger);
        if (!user) return { status: 404 };

        return { status: 200, body: user };
      },
    })
  );

  profile(): NodeBuilder<{ logger: Logger }> {
    return route<{ logger: Logger }>(
      validated({
        method: 'GET',
        path: '/profile',
        middleware: this.authMiddleware.requireAuth(),
        schema: {
          response: {
            200: User,
            404: Type.Undefined(),
          },
        },
        handler: async ({ user: sessionUser, logger }) => {
          const user = await this.userService.byId(sessionUser.id, logger);
          if (!user) return { status: 404 };

          return { status: 200, body: user };
        },
      })
    );
  }
}
