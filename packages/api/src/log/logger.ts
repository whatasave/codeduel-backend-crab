export interface Logger<T> {
  log(date: number, log: T): Promise<void> | void;
}

export class LoggerFilter<T> implements Logger<T> {
  constructor(
    private logger: Logger<T>,
    private filter: (date: number, log: T) => boolean
  ) {}

  log(date: number, log: T): Promise<void> | void {
    if (this.filter(date, log)) {
      return this.logger.log(date, log);
    }
  }
}

export class CompositeLogger<T> implements Logger<T> {
  constructor(private loggers: Logger<T>[]) {}

  async log(date: number, log: T): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const logger of this.loggers) {
      const logPromise = logger.log(date, log);
      if (logPromise) promises.push(logPromise);
    }
    await Promise.allSettled(promises);
  }
}
