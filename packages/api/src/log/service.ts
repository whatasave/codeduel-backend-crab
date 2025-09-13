import { CompositeLogger, type Logger } from './logger';

export interface LoggerServiceOptions {
  loggers: Logger<Log<unknown>>[];
}

export interface Log<T> {
  type: string;
  message: T;
}

export class LoggerService {
  private readonly logger: CompositeLogger<Log<unknown>>;

  constructor({ loggers }: LoggerServiceOptions) {
    this.logger = new CompositeLogger<Log<unknown>>(loggers);
  }

  log(type: string, message: unknown): Promise<void> {
    return this.logger.log(Date.now(), { type, message });
  }
}
