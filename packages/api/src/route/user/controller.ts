import { internalServerError, notFound, ok, type RouterGroup } from '@codeduel-backend-crab/server';
import { Type } from '@sinclair/typebox';
import { validated } from '@codeduel-backend-crab/server/validation';
import type { UserService } from './service';
import { User } from './data';
import type { AuthService } from '../auth/service';
import { requireAuth } from '../auth/middleware';

export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService
  ) {}

  setup(group: RouterGroup): void {
    const authGroup = group.group({ middlewares: [requireAuth(this.authService)] });

    group.route(this.byId);
    group.route(this.users);

    authGroup.route(this.profile);
  }

  users = validated({
    method: 'GET',
    path: '/',
    schema: {
      request: {
        query: { username: Type.Optional(Type.String()) },
      },
      response: {
        200: Type.Union([User, Type.Array(User)]),
        404: Type.Object({
          error: Type.String(),
        }),
      },
    },
    handler: async ({ query }) => {
      const { username } = query;
      if (!username) return ok(await this.userService.all());

      const user = await this.userService.byUsername(username);
      if (!user) return notFound({ error: 'User not found' });
      return ok(user);
    },
  });

  byId = validated({
    method: 'GET',
    path: '/:id',
    schema: {
      request: {
        params: { id: Type.Number() },
      },
      response: {
        200: User,
        404: Type.Object({
          error: Type.String(),
        }),
      },
    },
    handler: async ({ params }) => {
      const { id } = params;
      const user = await this.userService.byId(id);
      if (!user) return notFound({ error: 'User not found' });
      return ok(user);
    },
  });

  profile = validated({
    method: 'GET',
    path: '/profile',
    schema: {
      request: {},
      response: {},
    },
    handler: async () => {
      return internalServerError({ error: 'Path not implemented' });
    },
  });
}
