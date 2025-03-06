import { BunServer } from '@codeduel-backend-crab/server/bun';
import { Router } from '../../server/src/router';
import { RootController } from './route/controller';
import { loadConfigFromEnv } from './config';

const { config, error } = loadConfigFromEnv();
if (!config) {
  console.error(`Invalid environment: ${error}`);
  process.exit(1);
}

const router = new Router();

const rootController = new RootController();
rootController.setup(router.group({ prefix: '/v1' }));

const server = new BunServer(router);
const running = server.listen({ host: config.host, port: config.port });
console.log(`Server is running on ${running.url}`);
