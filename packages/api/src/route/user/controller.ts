import { Type } from '@sinclair/typebox';
import type { UserService } from './service';
import { User } from './data';
import type { AuthMiddleware } from '../auth/middleware';
import type { TypeBoxGroup } from '@glass-cannon/typebox';
import { route } from '../../utils/route';
import { pipe } from '@glass-cannon/router/middleware';
import type { Logger } from '@codeduel-backend-crab/logger';
import { loggerDecorator } from '../../middleware/logger';

export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authMiddleware: AuthMiddleware,
    private readonly logger: Logger
  ) {}

  setup(group: TypeBoxGroup): void {
    this.byId(group);
    this.users(group);
    this.profile(group);
  }

  users = route(() => ({
    method: 'GET',
    path: '/',
    middleware: loggerDecorator(this.logger),
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
  }));

  byId = route(() => ({
    method: 'GET',
    path: '/:id',
    middleware: loggerDecorator(this.logger),
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
  }));

  profile = route(() => ({
    method: 'GET',
    path: '/profile',
    middleware: pipe(loggerDecorator(this.logger), this.authMiddleware.requireAuth()),
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
  }));
}
