import { ok, type Route, type RouterGroup } from '@codeduel-backend-crab/server';

export class RedocController {
  setup(group: RouterGroup): void {
    group.route(this.redoc);
  }

  redoc: Route = {
    method: 'GET',
    path: '/',
    handler: async () =>
      ok(
        `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <script type="module" src="https://unpkg.com/rapidoc/dist/rapidoc-min.js"></script>
    </head>
    <body>
      <rapi-doc spec-url="/openapi"></rapi-doc>
    </body>
  </html>`,
        { 'content-type': 'text/html' }
      ),
  };
}
