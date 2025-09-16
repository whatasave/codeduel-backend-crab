export interface Logger<T> {
  log(log: T): Promise<void> | void;
}

export class LoggerFilter<T> implements Logger<T> {
  constructor(
    private logger: Logger<T>,
    private filter: (log: T) => boolean
  ) {}

  log(log: T): Promise<void> | void {
    if (this.filter(log)) {
      return this.logger.log(log);
    }
  }
}

export class CompositeLogger<T> implements Logger<T> {
  constructor(private loggers: Logger<T>[]) {}

  async log(log: T): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const logger of this.loggers) {
      const logPromise = logger.log(log);
      if (logPromise) promises.push(logPromise);
    }
    await Promise.allSettled(promises);
  }
}
