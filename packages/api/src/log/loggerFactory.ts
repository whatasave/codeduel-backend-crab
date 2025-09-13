import { Type, type Static } from '@sinclair/typebox';
import { ConsoleLogger } from './console';
import { LoggerFilter, type Logger } from './logger';
import type { Log } from './service';
import { AssertError, Value } from '@sinclair/typebox/value';

export type LoggerConfig = Static<typeof LoggerConfig>;
export const LoggerConfig = Type.Object({
  type: Type.Union([Type.Literal('console')]),
  options: Type.Record(Type.String(), Type.Any(), { default: {} }),
  enabled: Type.Optional(Type.Union([Type.Array(Type.String()), Type.Undefined()])),
});

export type ConsoleLoggerConfig = Static<typeof ConsoleLoggerConfig>;
export const ConsoleLoggerConfig = Type.Object({
  locale: Type.Optional(Type.String()),
});

export class LoggerFactory {
  create(type: string, options: unknown, enabled?: string[]): Logger<Log<unknown>> {
    try {
      const factories: Record<string, () => Logger<Log<unknown>>> = {
        console: () => this.createConsoleLogger(Value.Parse(ConsoleLoggerConfig, options)),
      };

      const logger = factories[type]?.();
      if (!logger) throw new Error(`Unknown logger type: ${type}`);
      if (enabled) return new LoggerFilter(logger, (_, log) => enabled.includes(log.type));
      return logger;
    } catch (error) {
      if (error instanceof AssertError) {
        const errors = Array.from(error.Errors())
          .map((e) => `\t${e.path}: ${e.message}, Received: ${String(e.value)}`)
          .join('\n');
        throw new Error(`Invalid logger:\n${errors}`);
      }
      throw error;
    }
  }

  createComposite(loggers: LoggerConfig[]): Logger<Log<unknown>>[] {
    return loggers.map((config) => this.create(config.type, config.options, config.enabled));
  }

  createConsoleLogger(options: ConsoleLoggerConfig): ConsoleLogger {
    return new ConsoleLogger({
      formatDate: this.parseFormatDate(options.locale),
    });
  }

  private parseFormatDate(locale?: string): (date: number) => string {
    return (date) => new Date(date).toLocaleString(locale);
  }
}
