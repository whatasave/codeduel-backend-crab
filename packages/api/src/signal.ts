import type { Database } from '@codeduel-backend-crab/database';
import type { Logger } from '@codeduel-backend-crab/logger';
import type { RunningServer } from '@glass-cannon/server-bun';

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

export function setupSignals(
  server: RunningServer,
  database: Database,
  logger: Logger,
  onShutdown: () => void = () => {},
  timeoutMs = DEFAULT_SHUTDOWN_TIMEOUT_MS
): void {
  let shuttingDown = false;

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      if (shuttingDown) {
        logger.debug('process.shutdown', `received ${signal} while shutting down`, { signal });
        return;
      }
      shuttingDown = true;
      logger.info('process.shutdown', `received ${signal}, shutting down`, { signal });

      const timer = setTimeout(() => {
        logger.fatal('process.shutdownTimeout', 'graceful shutdown timed out, forcing exit', {
          timeoutMs,
        });
        process.exit(1);
      }, timeoutMs);
      timer.unref();

      onShutdown();

      void shutdown(server, database, logger).then((ok) => {
        clearTimeout(timer);
        process.exit(ok ? 0 : 1);
      });
    });
  }
}

async function shutdown(
  server: RunningServer,
  database: Database,
  logger: Logger
): Promise<boolean> {
  let ok = true;

  try {
    await server.stop();
    logger.info('server.stopped', 'server stopped');
  } catch (error) {
    ok = false;
    logger.error('server.stopFailed', 'failed to stop server', {
      error: logger.errorData(error),
    });
  }

  try {
    await database.destroy();
    logger.info('database.closed', 'database connection closed');
  } catch (error) {
    ok = false;
    logger.error('database.closeFailed', 'failed to close database connection', {
      error: logger.errorData(error),
    });
  }

  return ok;
}
