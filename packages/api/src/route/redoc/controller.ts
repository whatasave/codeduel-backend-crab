import type { RouteOptions } from '@glass-cannon/router';
import { html } from '@glass-cannon/server-bun';
import type { TypeBoxGroup } from '@glass-cannon/typebox';

export class RedocController {
  setup(group: TypeBoxGroup): void {
    group.route(this.redoc);
  }

  redoc: RouteOptions = {
    method: 'GET',
    path: '/',
    handler: async () =>
      html({
        status: 200,
        body: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <script type="module" src="https://unpkg.com/rapidoc/dist/rapidoc-min.js"></script>
  </head>
  <body>
    <rapi-doc spec-url="/openapi"></rapi-doc>
  </body>
</html>`,
      }),
  };
}
