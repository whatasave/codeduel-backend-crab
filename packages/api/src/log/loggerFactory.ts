import { ConsoleLogger } from './console';
import { CompositeLogger, LoggerFilter, type Logger } from './logger';
import type { Log, Request } from './service';
import { AssertError, Value } from '@sinclair/typebox/value';
import type { LoggerConfig } from './config';
import { ConsoleLoggerConfig } from './config';

export class LoggerFactory {
  private readonly STRING_LOGGERS: string[] = ['console'];
  private readonly REQUEST_LOGGERS: string[] = [];

  createCompositeString(loggers: LoggerConfig[]): Logger<Log<string>> {
    return new CompositeLogger(
      loggers
        .filter((config) => this.STRING_LOGGERS.includes(config.type))
        .map((config) => this.create(config))
    );
  }

  createCompositeRequest(loggers: LoggerConfig[]): Logger<Log<Request>> {
    return new CompositeLogger(
      loggers
        .filter((config) => this.REQUEST_LOGGERS.includes(config.type))
        .map((config) => this.create(config))
    );
  }

  create<T>({ type, options, enabled, disabled }: LoggerConfig): Logger<Log<T>> {
    try {
      const factories: Record<string, () => Logger<Log<never>>> = {
        console: () => this.createConsoleLogger(Value.Parse(ConsoleLoggerConfig, options)),
      };

      let logger = factories[type]?.();
      if (!logger) throw new Error(`Unknown logger type: ${type}`);
      if (enabled) logger = this.createFilterEnabled(logger, enabled);
      if (disabled) logger = this.createFilterDisabled(logger, disabled);
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

  createFilterEnabled<T>(logger: Logger<Log<T>>, enabled: string[]): Logger<Log<T>> {
    const enabledRegex = enabled.map(
      (e) => new RegExp(`^(${escapeRegExp(e)}|${escapeRegExp(e)}\\..*)$`)
    );

    return new LoggerFilter(logger, (log) => enabledRegex.some((regex) => regex.test(log.type)));
  }

  createFilterDisabled<T>(logger: Logger<Log<T>>, disabled: string[]): Logger<Log<T>> {
    const disabledRegex = disabled.map(
      (e) => new RegExp(`^(${escapeRegExp(e)}|${escapeRegExp(e)}\\..*)$`)
    );

    return new LoggerFilter(logger, (log) => disabledRegex.every((regex) => !regex.test(log.type)));
  }

  createConsoleLogger(options: ConsoleLoggerConfig): ConsoleLogger {
    return new ConsoleLogger({
      formatDate: options.showDate ? this.dateFormatterFromLocale(options.locale) : undefined,
      showType: options.showType,
    });
  }

  private dateFormatterFromLocale(locale?: string): (date: number) => string {
    return (date) => new Date(date).toLocaleString(locale);
  }
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
