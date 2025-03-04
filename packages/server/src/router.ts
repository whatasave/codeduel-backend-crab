import { type Record } from '@sinclair/typebox';
import type { Method, Request, Response, Handler, Route, SchemaToRequest } from './types';

export class Router {
  private readonly root = new RouterNode();

  constructor(private readonly fallback: Handler = async () => ({ status: 404 })) {}

  route(route: Route) {
    this.root.route(route);
  }

  group(group: Group): RouterGroup {
    return {
      route: (route) => this.route({ ...route, path: join(group.prefix, route.path) }),
      group: (group) => this.group({ prefix: join(group.prefix, group.prefix) }),
    };
  }

  handle(request: Request): Promise<Response> {
    return this.root.handle(request) ?? this.fallback(request);
  }

  allRoutes(): Generator<Route> {
    return this.root.allRoutes();
  }
}

export interface Group {
  prefix?: string;
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

  route(route: Route, path = route.path) {
    const [part, ...parts] = path.split('/').filter(Boolean);
    if (!part) {
      this.methods[route.method] = route;
      return;
    }
    const child = this.children.get(part) ?? new RouterNode();
    child.route(route, parts.join('/'));
    this.children.set(part, child);
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

function join(...parts: (string | undefined)[]) {
  return parts.filter(Boolean).join('/');
}
