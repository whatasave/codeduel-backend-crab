import {
  createDatabase,
  pingDatabase,
  type Config as DatabaseConfig,
  type Database,
} from '@codeduel-backend-crab/database';
import type { Logger } from '@codeduel-backend-crab/logger';

export function setupDatabase(
  config: DatabaseConfig,
  logger: Logger
): { database: Database; closeDatabase: () => Promise<void> } {
  const database = createDatabase(config, {
    onQuery: logger.isLevelEnabled('debug')
      ? ({ sql, durationMs }): void => {
          logger.debug('query', 'query executed', { sql, durationMs });
        }
      : undefined,
    onQueryError: ({ sql, durationMs, error }): void => {
      logger.error('queryError', 'query failed', {
        sql,
        durationMs,
        error: logger.errorData(error),
      });
    },
    onPoolError: (error): void => {
      logger.error('poolError', 'unexpected error on idle database client', {
        error: logger.errorData(error),
      });
    },
  });

  void pingDatabase(database, (error) => {
    logger.warn('pingFailed', 'cannot connect to the database', {
      error: logger.errorData(error),
    });
  }).then((success) => {
    if (success) logger.info('connected', 'database connection established');
  });

  const closeDatabase = async (): Promise<void> => {
    try {
      await database.destroy();
      logger.info('closed', 'database connection closed');
    } catch (error) {
      logger.error('closeFailed', 'failed to close database connection', {
        error: logger.errorData(error),
      });
    }
  };

  return { database, closeDatabase };
}
