export interface Logger<T> {
  log(log: T): Promise<void>;
}

export class LoggerFilter<T> implements Logger<T> {
  constructor(
    private logger: Logger<T>,
    private filter: (log: T) => boolean
  ) {}

  async log(log: T): Promise<void> {
    if (this.filter(log)) {
      return await this.logger.log(log);
    }
  }
}

export class CompositeLogger<T> implements Logger<T> {
  constructor(private loggers: Logger<T>[]) {}

  async log(log: T): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const logger of this.loggers) {
      const logPromise = logger.log(log);
      promises.push(logPromise);
    }
    const results = await Promise.allSettled(promises);
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error(`${this.loggers[i]?.constructor.name} failed:`);
        console.error(result.reason);
      }
    });
  }
}
