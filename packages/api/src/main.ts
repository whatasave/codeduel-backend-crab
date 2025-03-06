import { BunServer } from '@codeduel-backend-crab/server/bun';
import { Router } from '../../server/src/router';
import { RootController } from './route/controller';

const router = new Router();

const rootController = new RootController();
rootController.setup(router.group({ prefix: '/v1' }));

const server = new BunServer(router);
server.listen({ host: 'localhost', port: 3000 });
console.log('Server is running on http://localhost:3000');
