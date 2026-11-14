import { RootController } from './route/controller';
import { safeLoadConfig } from './config';
import { createDatabase, pingDatabase } from '@codeduel-backend-crab/database';
import { defaultErrorHandler, descriptiveErrorHandler } from './middleware/errors';
import { Router, type RouterGroup } from '@glass-cannon/router';
import { cors } from '@glass-cannon/cors';
import { typebox } from '@glass-cannon/typebox';
import { BunServer, json, text } from '@glass-cannon/server-bun';
import { pipe } from '@glass-cannon/router/middleware';
import { Logger } from '@codeduel-backend-crab/logger';
import { logRequests } from './middleware/logger';
import { traceRequests } from './middleware/trace';

const { config, error } = safeLoadConfig();
if (!config) {
  // The configured logger is not available yet, use a default one to report the failure.
  const bootstrapLogger = Logger.create({
    level: 'info',
    serviceName: process.env.SERVICE_NAME ?? 'backend',
  });
  bootstrapLogger.fatal('config.invalid', 'cannot load configuration', { error });
  process.exit(1);
}

const logger = Logger.create(config.logger);

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
  },
});

const databaseLogger = logger.group({ type: 'database' });
const database = createDatabase(config.database, {
  onQuery: databaseLogger.isLevelEnabled('debug')
    ? ({ sql, durationMs }): void => {
        databaseLogger.debug('query', 'query executed', { sql, durationMs });
      }
    : undefined,
  onQueryError: ({ sql, durationMs, error }): void => {
    databaseLogger.error('queryError', 'query failed', {
      sql,
      durationMs,
      error: databaseLogger.errorData(error),
    });
  },
  onPoolError: (error): void => {
    databaseLogger.error('poolError', 'unexpected error on idle database client', {
      error: databaseLogger.errorData(error),
    });
  },
});

void pingDatabase(database, (error) => {
  databaseLogger.warn('pingFailed', 'cannot connect to the database', {
    error: databaseLogger.errorData(error),
  });
}).then((success) => {
  if (success) databaseLogger.info('connected', 'database connection established');
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

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    logger.info('process.shutdown', `received ${signal}, shutting down`, { signal });
    void database
      .destroy()
      .catch((error: unknown) => {
        databaseLogger.error('destroyError', 'failed to close database connections', {
          error: databaseLogger.errorData(error),
        });
      })
      .finally(() => process.exit(0));
  });
}

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
const rootWithMiddlewares = root.group({
  middleware: pipe(traceRequests(logger), logRequests(logger), errorHandler(logger)),
});

const typeboxRoot = typebox(rootWithMiddlewares, {
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

logger.info('listening', `Server is running on ${running.url}`, { url: running.url });
