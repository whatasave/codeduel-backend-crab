import type { Logger } from './logger';
import type { Log } from './service';

export interface ConsoleLoggerOptions {
  formatDate?: (date: number) => string;
  showType: boolean;
}

export class ConsoleLogger implements Logger<Log<string>> {
  constructor(private options: ConsoleLoggerOptions) {}

  async log(log: Log<string>): Promise<void> {
    if (this.options.formatDate === undefined && !this.options.showType) {
      return console.log(log.message);
    }

    let prefix = '';
    if (this.options.formatDate) prefix += `[${this.options.formatDate(log.date)}]`;
    if (this.options.showType) prefix += `[${log.type}]`;

    if (log.type.startsWith('error')) {
      console.error(prefix, log.message);
      if (log.error !== undefined) console.error(log.error);
      return;
    }

    if (log.type.startsWith('warn')) {
      console.warn(prefix, log.message);
      if (log.error !== undefined) console.warn(log.error);
      return;
    }

    console.log(prefix, log.message);
    if (log.error !== undefined) console.log(log.error);
  }
}
