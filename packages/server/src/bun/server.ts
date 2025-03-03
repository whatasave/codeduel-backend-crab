import type { Method, Request as ServerRequest } from '../request';
import type { Response as ServerResponse } from '../response';
import { Router } from '../router';
import type { Handler, ListenOptions, RunningServer, Server } from '../server';

export class BunServer implements Server {
  private handler: Handler;

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
    if (contentType === 'application/json') return await request.json();
    if (contentType === 'application/x-www-form-urlencoded') return await request.formData();
    if (contentType === 'text/plain') return await request.text();
    return () => request.body;
  }

  private toResponse(response: ServerResponse) {
    if (typeof response.body === 'object') {
      response.headers ??= new Headers();
      response.headers.set('content-type', 'application/json');
      return new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: response.headers,
      });
    }
    return new Response(response.body as BodyInit, {
      status: response.status,
      headers: response.headers,
    });
  }
}
