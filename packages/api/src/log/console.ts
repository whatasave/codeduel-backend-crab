import type { Logger } from './logger';
import type { Log } from './service';

export interface ConsoleLoggerOptions {
  formatDate: (date: number) => string;
}

export class ConsoleLogger implements Logger<Log<unknown>> {
  private readonly formatDate: (date: number) => string;

  constructor({ formatDate }: ConsoleLoggerOptions) {
    this.formatDate = formatDate;
  }

  log(date: number, log: Log<unknown>): void {
    console.log(`[${this.formatDate(date)}]`, log.message);
  }
}
