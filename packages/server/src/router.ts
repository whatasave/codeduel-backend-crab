import { Type, type Record } from '@sinclair/typebox';
import type { Method, Request, Response, Handler, Route, SchemaToRequest } from './types';
import { OpenApiBuilder, type OpenAPIObject } from 'openapi3-ts/oas31';

export class Router {
  private readonly root = new RouterNode();

  constructor(private readonly fallback: Handler = async () => ({ status: 404 })) {}

  route(route: Route): void {
    this.root.route(route);
  }

  group(group: Group): RouterGroup {
    return {
      route: (route) => this.route({ ...route, path: join(group.prefix, route.path) }),
      group: (childGroup) => this.group({ prefix: join(group.prefix, childGroup.prefix) }),
    };
  }

  handle(request: Request): Promise<Response> {
    return this.root.handle(request) ?? this.fallback(request);
  }

  allRoutes(): Generator<Route> {
    return this.root.allRoutes();
  }

  openapi(): OpenAPIObject {
    const builder = new OpenApiBuilder();
    builder.addResponse('400', {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: Type.Object({
            errors: Type.Array(Type.String()),
          }),
        },
      },
    });

    for (const route of this.allRoutes()) {
      if (!route.schema) continue;
      builder.addPath(route.path, {
        [route.method.toLowerCase()]: {
          requestBody: {
            content: {
              'application/json': {
                schema: route.schema.request.body ?? Type.Undefined(),
              },
            },
          },
          parameters: {
            ...this.mapValues(route.schema.request.query ?? {}, (schema) => ({
              in: 'query',
              schema,
            })),
          },
          responses: this.mapValues(route.schema.response, (schema) => ({
            content: {
              'application/json': {
                schema,
              },
            },
          })),
        },
      });
    }

    return builder.getSpec();
  }

  private mapValues<T, U>(obj: Record<string, T>, fn: (value: T) => U): Record<string, U> {
    return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, fn(value)]));
  }
}

export type PathString = `/${string}`;

export interface Group {
  prefix?: PathString;
}

export interface RouterGroup {
  route(route: Route): void;
  group(group: Group): RouterGroup;
}

class RouterNode {
  constructor(
    private methods: Partial<Record<Method, Route>> = {},
    private readonly children: Map<string, RouterNode> = new Map()
  ) {}

  route(route: Route, path = route.path): Route {
    const [part, ...parts] = path.split('/').filter(Boolean);
    if (!part) {
      this.methods[route.method] = route;
      return route;
    }
    const child = this.children.get(part) ?? new RouterNode();
    const addedRoute = child.route(route, join(...parts));
    this.children.set(part, child);
    return addedRoute;
  }

  handle(request: Request): Promise<Response> | undefined {
    const [part, ...parts] = request.path.split('/').filter(Boolean);
    if (!part) return this.methods[request.method]?.handler(request as SchemaToRequest<never>);
    const child = this.children.get(part);
    return child?.handle({ ...request, path: join(...parts) });
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

export function join(...parts: (string | undefined)[]): PathString {
  const joinedPath = '/' + parts.filter(Boolean).join('/');
  const timedPath = joinedPath.replace(/\/{2,}/g, '/');
  return timedPath as PathString;
}
