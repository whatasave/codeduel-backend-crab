import { Logger } from '@codeduel-backend-crab/logger';
import { Router, routes } from '@glass-cannon/router';
import { BunServer, text } from '@glass-cannon/server-bun';

import { safeLoadConfig } from './config';
import { setupCors } from './cors';
import { setupDatabase } from './database';
import { validateCookies } from './route/auth/config';
import { RootController } from './route/controller';
import { setupSignals } from './signal';
import { setupTypebox } from './typebox';

const { config, error } = safeLoadConfig();
if (!config) {
  // The configured logger is not available yet, use a default one to report the failure.
  const bootstrapLogger = Logger.create({
    level: 'info',
    serviceName: process.env.SERVICE_NAME,
  });
  bootstrapLogger.fatal('config.invalid', 'cannot load configuration', { error });
  process.exit(1);
}

const logger = Logger.create(config.logger);

for (const problem of validateCookies(config.auth)) {
  logger.warn('config.cookie.unsafe', 'unsafe cookie configuration', { problem });
}

logger.info('config.loaded', 'configuration loaded', {
  host: config.host,
  port: config.port,
  descriptiveErrors: config.descriptiveErrors,
  logLevel: config.logger.level,
  cors: config.cors
    ? {
        allowedOrigins: config.cors.allowedOrigins ?? '*',
        allowCredentials: config.cors.allowCredentials,
      }
    : false,
  database: {
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    ssl: config.database.ssl ?? false,
    maxConnections: config.database.maxConnections,
  },
  auth: {
    userDefaultRole: config.auth.userDefaultRole,
    accessTokenExpiresIn: config.auth.accessToken.expiresIn,
    refreshTokenExpiresIn: config.auth.refreshToken.expiresIn,
    refreshTokenCleanupInterval: config.auth.refreshToken.cleanupInterval,
  },
});

process.on('unhandledRejection', (reason) => {
  logger.error('process.unhandledRejection', 'unhandled promise rejection', {
    error: logger.errorData(reason),
  });
});

process.on('uncaughtException', (error) => {
  logger.fatal('process.uncaughtException', 'uncaught exception', {
    error: logger.errorData(error),
  });
  process.exit(1);
});

const database = setupDatabase(config.database, logger.group({ type: 'database' }));

const controller = new RootController(database, logger, config);
const stopTokenCleanup = controller.startTokenCleanup();

const appRoutes = routes()
  .apply(setupCors(config.cors))
  .apply(setupTypebox(config.descriptiveErrors))
  .use(controller.setup())
  .route({
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

const router = Router.from(appRoutes);
const server = new BunServer(router.handle);
const running = await server.listen({ host: config.host, port: config.port });

logger.info('listening', `Server is running on ${running.url}`, { url: running.url });

setupSignals(running, database, logger, stopTokenCleanup);
