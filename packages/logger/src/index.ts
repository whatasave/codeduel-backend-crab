import pino from 'pino';
import type { Config, LogLevel } from './config';

export interface Log {
  type: string;
  message: string;
  context?: Record<string, unknown>;
}

interface LogRecord {
  type: string;
  message: string;
  context?: Record<string, unknown>;
}

type GroupOptions = Partial<Omit<Log, 'message'>>;

export class Logger {
  static create({ level, serviceName }: Config): Logger {
    const pinoLogger = pino({
      base: { service: serviceName },
      level,
      formatters: {
        level: (label) => ({ level: label }),
      },
      timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    });

    return new Logger(pinoLogger, {});
  }

  private constructor(
    private readonly pino: pino.Logger,
    private readonly groupOptions: GroupOptions
  ) {}

  isLevelEnabled(level: LogLevel): boolean {
    return this.pino.isLevelEnabled(level);
  }

  createLog(type: Log['type'], message: Log['message'], context: Log['context']): LogRecord {
    return {
      type: this.groupOptions.type ? `${this.groupOptions.type}.${type}` : type,
      message,
      context: { ...this.groupOptions.context, ...context },
    };
  }

  group({ type, context }: GroupOptions): Logger {
    return new Logger(this.pino, {
      type: this.groupOptions.type ? `${this.groupOptions.type}.${type}` : type,
      context: { ...context, ...this.groupOptions.context },
    });
  }

  errorData(error: unknown): unknown {
    if (error instanceof Error) {
      return { message: error.message, stack: error.stack };
    }
    return { message: String(error) };
  }

  debug(type: Log['type'], message: Log['message'], context?: Log['context']): void {
    this.pino.debug(this.createLog(type, message, context));
  }

  info(type: Log['type'], message: Log['message'], context?: Log['context']): void {
    this.pino.info(this.createLog(type, message, context));
  }

  warn(type: Log['type'], message: Log['message'], context?: Log['context']): void {
    this.pino.warn(this.createLog(type, message, context));
  }

  error(type: Log['type'], message: Log['message'], context?: Log['context']): void {
    this.pino.error(this.createLog(type, message, context));
  }

  fatal(type: Log['type'], message: Log['message'], context?: Log['context']): void {
    this.pino.fatal(this.createLog(type, message, context));
  }
}

export * from './config';
