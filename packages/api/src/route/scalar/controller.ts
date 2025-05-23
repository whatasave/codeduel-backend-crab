import type { RouteOptions } from '@glass-cannon/router';
import { html } from '@glass-cannon/server-bun';
import type { TypeBoxGroup } from '@glass-cannon/typebox';

export class ScalarController {
  setup(group: TypeBoxGroup): void {
    group.route(this.redoc);
  }

  redoc: RouteOptions = {
    method: 'GET',
    path: '/',
    handler: async () =>
      html({
        status: 200,
        body: `<!doctype html>
<html>
  <head>
    <title>Scalar API Reference</title>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1" />
  </head>

  <body>
    <div id="app"></div>

    <!-- Load the Script -->
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>

    <!-- Initialize the Scalar API Reference -->
    <script>
      Scalar.createApiReference('#app', {
        url: '/openapi',
      })
    </script>
  </body>
</html>`,
      }),
  };
}
