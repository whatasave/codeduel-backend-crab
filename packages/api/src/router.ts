import {
  join,
  Router,
  type Group,
  type Handler,
  type Method,
  type PathString,
  type Request,
  type Response,
  type RouteSchema,
} from '@codeduel-backend-crab/server';
import { validation } from '@codeduel-backend-crab/server/validation';
import { Type } from '@sinclair/typebox';
import { OpenApiBuilder } from 'openapi3-ts/oas31';

export interface BackendRoute<Schema extends RouteSchema> {
  method: Method;
  path: PathString;
  schema: Schema;
  handler: Handler<Schema>;
}

export interface BackendRouterGroup {
  route<Schema extends RouteSchema>(route: BackendRoute<Schema>): void;
  group(group: Group): BackendRouterGroup;
}

export class BackendRouter {
  private readonly router = new Router();
  private readonly openApiBuilder = new OpenApiBuilder();

  constructor() {
    this.openApiBuilder.addResponse('400', {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: Type.Object({
            errors: Type.Array(Type.String()),
          }),
        },
      },
    });

    this.router.route({
      method: 'GET',
      path: '/openapi',
      handler: async () => {
        return {
          status: 200,
          body: this.openApiBuilder.rootDoc,
        };
      },
    });
  }

  route<Schema extends RouteSchema>(route: BackendRoute<Schema>) {
    this.router.route({ ...route, handler: validation(route.schema, route.handler) });
    this.openApiBuilder.addPath(route.path, {
      [route.method.toLowerCase()]: {
        ...(route.schema.request.body && {
          requestBody: {
            content: {
              'application/json': {
                schema: route.schema.request.body,
              },
            },
          },
        }),
        responses: route.schema.response,
      },
    });
  }

  group(group: Group): BackendRouterGroup {
    return {
      route: (route) => this.route({ ...route, path: join(group.prefix, route.path) }),
      group: (nestedGroup) =>
        this.group({ ...nestedGroup, prefix: join(group.prefix, nestedGroup.prefix) }),
    };
  }

  handle(request: Request): Promise<Response> {
    return this.router.handle(request);
  }
}
