import { BunServer } from '@codeduel-backend-crab/server/bun';
import { ok, Router } from '@codeduel-backend-crab/server';
import { RootController } from './route/controller';
import { safeLoadConfig } from './config';

const { config, error } = safeLoadConfig();
if (!config) {
  console.error(`Invalid environment: ${error}`);
  process.exit(1);
}

const router = new Router();

const rootController = new RootController();
rootController.setup(router.group({ prefix: '/v1' }));

const openapi = router.openapi();
router.route({
  method: 'GET',
  path: '/openapi',
  handler: async () => ok(openapi),
});

const server = new BunServer((request) => router.handle(request));
const running = server.listen({ host: config.host, port: config.port });
console.log(`Server is running on ${running.url}`);
