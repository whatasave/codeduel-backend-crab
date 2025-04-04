import { BunServer } from '@codeduel-backend-crab/server/bun';
import { movedPermanently, ok, Router } from '@codeduel-backend-crab/server';
import { RootController } from './route/controller';
import { safeLoadConfig } from './config';
import { Cors } from '@codeduel-backend-crab/server/cors';

const { config, error } = safeLoadConfig();
if (!config) {
  console.error(error);
  process.exit(1);
}

const router = new Router();

const middlewares = [];

const cors = config.cors && new Cors(config.cors);
if (cors) {
  router.route(cors.preflight);
  middlewares.push(cors.middleware);
}

const root = router.group({ middlewares });

const controller = new RootController();
controller.setup(root.group({ prefix: '/v1' }));

const openapi = router.openapi();
root.route({
  method: 'GET',
  path: '/openapi',
  handler: async () => ok(openapi),
});

root.route({
  method: 'GET',
  path: '/',
  handler: async () =>
    movedPermanently('Redirecting to /v1/redoc', {
      Location: '/v1/redoc',
      'Content-Type': 'text/plain',
    }),
});

const server = new BunServer((request) => router.handle(request));
const running = server.listen({ host: config.host, port: config.port });
console.log(`Server is running on ${running.url}`);
