import { badRequest, created, notFound, ok, type RouterGroup } from '@codeduel-backend-crab/server';
import { Type } from '@sinclair/typebox';
import { validated } from '@codeduel-backend-crab/server/validation';
import type { UserService } from './service';
import { CreateUser, User } from './data';

export class UserController {
  constructor(private readonly userService: UserService) {}

  setup(group: RouterGroup): void {
    group.route(this.findById);
    group.route(this.findByUsername);
    group.route(this.getProfile);
    group.route(this.createUser);
  }

  findByUsername = validated({
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
      if (!username) return ok(await this.userService.findAll());

      const user = await this.userService.findByUsername(username);
      if (!user) return notFound({ error: 'User not found' });
      return ok(user);
    },
  });

  findById = validated({
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
      const user = await this.userService.findById(id);
      if (!user) return notFound({ error: 'User not found' });
      return ok(user);
    },
  });

  getProfile = validated({
    method: 'GET',
    path: '/profile',
    schema: {
      request: {},
      response: {
        400: Type.Object({
          error: Type.String(),
        }),
      },
    },
    handler: async () => {
      return badRequest({ error: 'Path not implemented' });
    },
  });

  createUser = validated({
    method: 'POST',
    path: '/',
    schema: {
      request: {
        body: CreateUser,
      },
      response: {
        201: User,
        400: Type.Object({
          error: Type.String(),
        }),
      },
    },
    handler: async ({ body }) => {
      const user: CreateUser = body;
      const newUser = await this.userService.create(user);
      if (!newUser) return badRequest({ error: 'User already exists' });
      return created(newUser);
    },
  });
}
