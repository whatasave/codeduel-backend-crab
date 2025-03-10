import type {
  Handler,
  Method,
  Request as ServerRequest,
  Response as ServerResponse,
} from '../types';
import { Router } from '../router';
import type { ListenOptions, RunningServer, Server } from '../server';

export class BunServer implements Server {
  private readonly handler: Handler;

  constructor(handler: Handler | Router) {
    if (handler instanceof Router) {
      this.handler = handler.handle.bind(handler);
    } else {
      this.handler = handler;
    }
  }

  listen({ host, port }: ListenOptions): RunningServer {
    const server = Bun.serve({
      hostname: host,
      port,
      fetch: async (request) => {
        const serverRequest = await this.toServerRequest(request);
        const response = await this.handler(serverRequest);
        return this.toResponse(response);
      },
    });
    return {
      url: server.url,
      host: server.hostname,
      port: server.port,
      stop: () => server.stop(),
    };
  }

  async handle(request: ServerRequest): Promise<ServerResponse> {
    return this.handler(request);
  }

  private async toServerRequest(request: Request): Promise<ServerRequest> {
    const url = new URL(request.url);
    return {
      method: request.method as Method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      body: this.getBody(request),
      headers: request.headers,
    };
  }

  private async getBody(request: Request): Promise<unknown> {
    const contentType = request.headers.get('content-type');

    switch (contentType) {
      case 'application/json':
        return await request.json();
      case 'application/x-www-form-urlencoded':
        return await request.formData();
      case 'text/plain':
        return await request.text();
      default:
        return () => request.body;
    }
  }

  private toResponse(response: ServerResponse): Response {
    const bodyType = typeof response.body;

    switch (bodyType) {
      case 'string':
      case 'number':
      case 'boolean':
      case 'bigint':
      case 'object':
        response.headers ??= new Headers();
        response.headers.set('content-type', 'application/json');
        return new Response(JSON.stringify(response.body), {
          status: response.status,
          headers: response.headers,
        });
      case 'undefined':
        return new Response(undefined, {
          status: response.status,
          headers: response.headers,
        });
      default:
        throw new Error(`Unsupported body type: ${bodyType}`);
    }
  }
}
