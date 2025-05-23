import { Type } from '@sinclair/typebox';
import type { UserService } from './service';
import { User } from './data';
import type { AuthMiddleware } from '../auth/middleware';
import type { TypeBoxGroup } from '@glass-cannon/typebox';
import { route } from '../../utils/route';

export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authMiddleware: AuthMiddleware
  ) {}

  setup(group: TypeBoxGroup): void {
    this.byId(group);
    this.users(group);
    this.profile(group);
  }

  users = route({
    method: 'GET',
    path: '/',
    schema: {
      query: { username: Type.Optional(Type.String()) },
      response: {
        200: Type.Union([User, Type.Array(User)]),
        404: Type.Undefined(),
      },
    },
    handler: async ({ query }) => {
      const { username } = query;
      if (!username) return { status: 200, body: await this.userService.all() };

      const user = await this.userService.byUsername(username);
      if (!user) return { status: 404 };
      return { status: 200, body: user };
    },
  });

  byId = route({
    method: 'GET',
    path: '/:id',
    schema: {
      params: { id: Type.Number() },
      response: {
        200: User,
        404: Type.Undefined(),
      },
    },
    handler: async ({ params }) => {
      const { id } = params;
      const user = await this.userService.byId(id);
      if (!user) return { status: 404 };

      return { status: 200, body: user };
    },
  });

  profile = route(() => ({
    method: 'GET',
    path: '/profile',
    middleware: this.authMiddleware.requireAuth(),
    schema: {
      response: {},
    },
    handler: async () => {
      throw new Error('not implemented');
    },
  }));
}
