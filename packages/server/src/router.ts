import { Type, type Record } from '@sinclair/typebox';
import type { Method, Request, Response, Handler, Route } from './types';
import { OpenApiBuilder, type OpenAPIObject } from 'openapi3-ts/oas31';
import { applyMiddlewares, type Middleware } from './middleware';

export class Router {
  private readonly root = new RouterNode();

  constructor(private readonly fallback: Handler = async () => ({ status: 404 })) {}

  route(route: Route): void {
    this.root.route(route);
  }

  group(group: Group): RouterGroup {
    return {
      route: (route) =>
        this.route(
          applyMiddlewares(
            { ...route, path: join(group.prefix, route.path) },
            group.middlewares ?? []
          )
        ),
      group: (childGroup) =>
        this.group({
          prefix: join(group.prefix, childGroup.prefix),
          middlewares: [...(childGroup.middlewares ?? []), ...(group.middlewares ?? [])],
        }),
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
      if (!route.schema || !route.path || !route.method) continue;
      builder.addPath(route.path, {
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
          parameters: [
            ...Object.entries(route.schema.request.params ?? {}).map(([name, schema]) => ({
              name,
              in: 'path',
              schema,
            })),
            ...Object.entries(route.schema.request.query ?? {}).map(([name, schema]) => ({
              name,
              in: 'query',
              schema,
            })),
          ],
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
  middlewares?: Middleware[];
}

export interface RouterGroup {
  route(route: Route): void;
  group(group: Group): RouterGroup;
}

class RouterNode {
  constructor(
    private methods: Partial<Record<Method, Route>> = {},
    private allPaths: Partial<Record<Method, Route>> = {},
    private allMethods: Route | undefined = undefined,
    private fallback: Route | undefined = undefined,
    private readonly children: Map<string, RouterNode> = new Map(),
    private parameter: string | undefined = undefined
  ) {}

  route(route: Route, path: PathString | undefined = route.path): void {
    if (route.path === undefined) {
      if (route.method === undefined) {
        this.fallback = route;
      } else {
        this.allPaths[route.method] = route;
      }
      return;
    }

    if (!path || path === '/') {
      if (route.method === undefined) {
        this.allMethods = route;
      } else {
        this.methods[route.method] = route;
      }
      return;
    }

    const [part, parts] = split(path);
    if (!part) throw new Error('Should not happen');
    if (part.startsWith(':')) this.parameter = part.slice(1);
    const child = this.children.get(part) ?? new RouterNode();
    child.route(route, parts);
    this.children.set(part, child);
  }

  handle(
    request: Request,
    path: PathString | undefined = request.path as PathString,
    params: Record<string, string> = {}
  ): Promise<Response> | undefined {
    const [part, parts] = split(path);
    if (!part || part === '/') {
      const route =
        this.methods[request.method] ??
        this.allMethods ??
        this.allPaths[request.method] ??
        this.fallback;
      return route?.handler({ ...request, params });
    }
    let child = this.children.get(part);
    if (this.parameter) {
      child ??= this.children.get(`:${this.parameter}`);
      if (child) params[this.parameter] = part;
    }
    return (
      child?.handle(request, parts, params) ??
      this.allPaths[request.method]?.handler(request) ??
      this.fallback?.handler(request)
    );
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

export function split(path: PathString): [string, PathString] {
  const indexOfSlash = path.indexOf('/', 1);
  if (indexOfSlash === -1) return [path.slice(1), '/'];
  return [path.slice(1, indexOfSlash), path.slice(indexOfSlash) as PathString];
}

export function parameters(path: PathString): string[] {
  return path
    .split('/')
    .filter((part) => part.startsWith(':'))
    .map((part) => part.slice(1));
}
