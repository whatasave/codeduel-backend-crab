import { TypeGuard, type Record, Type } from '@sinclair/typebox';
import type { Method, Request } from './request';
import type { Response } from './response';
import type { Handler, Route, Routes, RouteSchema, SchemaToRequest } from './routes';
import { OpenApiBuilder, type OpenAPIObject } from 'openapi3-ts/oas31';
import { handleWithValidation } from './validation';

export class Router {
  private readonly root = new RouterNode();

  constructor(private fallback: Handler = async () => ({ status: 404, body: undefined })) {}

  route<Schema extends RouteSchema = RouteSchema>(route: Route<Schema>) {
    this.root.route(route);
  }

  routes<Schema extends RouteSchema = RouteSchema>(routes: Routes<Schema>) {
    this.root.routes(routes);
  }

  handle(request: Request): Promise<Response> {
    return this.root.handle(request) ?? this.fallback(request);
  }

  openapi(): OpenAPIObject {
    const openapi = new OpenApiBuilder();
    openapi.addResponse('400', {
      content: { 'application/json': Type.Array(Type.String()) },
      description: 'Validation errors',
    });
    for (const route of this.root.allRoutes()) {
      const schema = route.schema;
      openapi.addPath(route.path, {
        [route.method.toLowerCase()]: {
          ...(TypeGuard.IsUndefined(schema.request.body) && {
            requestBody: {
              content: {
                'application/json': {
                  schema: schema.request.body,
                },
              },
            },
          }),
          responses: Object.fromEntries(
            Object.entries(schema.response).map(([status, schema]) => [
              status,
              {
                description: schema.description,
                content: {
                  'application/json': {
                    schema,
                  },
                },
              },
            ])
          ),
        },
      });
    }
    return openapi.rootDoc;
  }
}

export class RouterNode {
  constructor(
    private methods: Partial<Record<Method, Route>> = {},
    private children: Map<string, RouterNode> = new Map()
  ) {}

  route<Schema extends RouteSchema = RouteSchema>(route: Route<Schema>, path = route.path) {
    const [part, ...parts] = path.split('/').filter(Boolean);
    if (!part) {
      this.methods[route.method] = {
        ...route,
        handler: handleWithValidation(route.schema, route.handler),
      };
      return;
    }
    const child = this.children.get(part) ?? new RouterNode();
    child.route(route, parts.join('/'));
    this.children.set(part, child);
  }

  routes<Schema extends RouteSchema = RouteSchema>(
    routes: Routes<Schema> | Route<Schema>,
    prefix = ''
  ) {
    if ('routes' in routes) {
      for (const child of routes.routes) {
        this.routes(child, prefix + (routes.prefix ?? ''));
      }
    } else {
      this.route({ ...routes, path: routes.path === '/' ? prefix : prefix + routes.path });
    }
  }

  handle(request: Request): Promise<Response> | undefined {
    const [part, ...parts] = request.path.split('/').filter(Boolean);
    if (!part) return this.methods[request.method]?.handler(request as SchemaToRequest<never>);
    const child = this.children.get(part);
    return child?.handle({ ...request, path: parts.join('/') });
  }

  *allRoutes(): Generator<Route> {
    for (const [_, child] of this.children) {
      yield* child.allRoutes();
    }
    for (const [_, route] of Object.entries(this.methods)) {
      yield route;
    }
  }
}
