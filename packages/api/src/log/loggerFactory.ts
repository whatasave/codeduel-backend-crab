import { ConsoleLogger } from './console';
import { LoggerFilter, type Logger } from './logger';
import type { Log } from './service';
import { AssertError, Value } from '@sinclair/typebox/value';
import type { LoggerConfig } from './config';
import { ConsoleLoggerConfig } from './config';

export class LoggerFactory {
  create({ type, options, enabled, disabled }: LoggerConfig): Logger<Log<unknown>> {
    try {
      const factories: Record<string, () => Logger<Log<unknown>>> = {
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

  createComposite(loggers: LoggerConfig[]): Logger<Log<unknown>>[] {
    return loggers.map((config) => this.create(config));
  }

  createFilterEnabled(logger: Logger<Log<unknown>>, enabled: string[]): Logger<Log<unknown>> {
    const enabledRegex = enabled.map(
      (e) => new RegExp(`^(${escapeRegExp(e)}|${escapeRegExp(e)}\\..*)$`)
    );

    return new LoggerFilter(logger, (log) => enabledRegex.some((regex) => regex.test(log.type)));
  }

  createFilterDisabled(logger: Logger<Log<unknown>>, disabled: string[]): Logger<Log<unknown>> {
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
