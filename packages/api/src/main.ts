import { RootController } from './route/controller';
import { safeLoadConfig } from './config';
import { createDatabase } from '@codeduel-backend-crab/database';
import { defaultErrorHandler, descriptiveErrorHandler } from './middleware/errors';
import { Router, type RouterGroup } from '@glass-cannon/router';
import { cors } from '@glass-cannon/cors';
import { typebox } from '@glass-cannon/typebox';
import { BunServer, json, text } from '@glass-cannon/server-bun';
import { LoggerService } from './log/service';
import { pipe } from '@glass-cannon/router/middleware';

const { config, error } = safeLoadConfig();
if (!config) {
  console.error(error);
  process.exit(1);
}

const logger = LoggerService.init(config.logger);
const database = createDatabase(config.database);
const router = new Router();

let root: RouterGroup = router;

if (config.cors) {
  const options = config.cors;
  root = cors(root, {
    allowOrigin: (origin) => options.allowedOrigins?.includes(origin) ?? true,
    allowMethods: options.allowedMethods,
    allowHeaders: options.allowedHeaders,
    allowCredentials: options.allowCredentials,
    exposeHeaders: options.exposeHeaders,
    maxAge: options.maxAge,
  });
}

const errorHandler = config.descriptiveErrors ? descriptiveErrorHandler : defaultErrorHandler;
root = root.group({ middleware: pipe(errorHandler, logger.middleware) });

const typeboxRoot = typebox(root, {
  openapi: {},
  onInvalidRequest: ({ errors }) =>
    config.descriptiveErrors ? json({ status: 400, body: { errors } }) : { status: 400 },
});

const controller = new RootController(database, logger, config);
controller.setup(typeboxRoot.group({ prefix: '/v1' }));

const openapi = typeboxRoot.openapi();
typeboxRoot.route({
  method: 'GET',
  path: '/openapi',
  handler: async () => json({ status: 200, body: openapi }),
});

typeboxRoot.route({
  method: 'GET',
  path: '/',
  handler: async () =>
    text({
      status: 301,
      body: 'Redirecting to /v1/scalar',
      headers: {
        Location: '/v1/scalar',
      },
    }),
});

const server = new BunServer(router.handle);
const running = await server.listen({ host: config.host, port: config.port });

void logger.log('listening', `Server is running on ${running.url}`);
