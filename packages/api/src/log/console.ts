import type { Logger } from './logger';
import type { Log } from './service';

export interface ConsoleLoggerOptions {
  formatDate?: (date: number) => string;
  showType: boolean;
}

export class ConsoleLogger implements Logger<Log<unknown>> {
  constructor(private options: ConsoleLoggerOptions) {}

  log(log: Log<unknown>): void {
    if (this.options.formatDate === undefined && !this.options.showType) {
      return console.log(log.message);
    }

    let prefix = '';
    if (this.options.formatDate) prefix += `[${this.options.formatDate(log.date)}]`;
    if (this.options.showType) prefix += `[${log.type}]`;

    if (log.type.startsWith('error')) {
      return console.error(prefix, log.message);
    }

    if (log.type.startsWith('warn')) {
      return console.warn(prefix, log.message);
    }

    console.log(prefix, log.message);
  }
}
