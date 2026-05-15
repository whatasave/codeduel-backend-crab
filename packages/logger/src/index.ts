import pino from 'pino';
import type { Config, LogLevel } from './config';

interface Log {
  type: string;
  message: string;
  context?: unknown;
}

export class Logger {
  private readonly pino: pino.Logger;

  constructor({ level, serviceName }: Config) {
    this.pino = pino({
      base: {
        service: serviceName,
      },
      level,
      formatters: {
        level: (label) => ({ level: label }),
      },
      timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    });
  }

  isLevelEnabled(level: LogLevel): boolean {
    return this.pino.isLevelEnabled(level);
  }

  createLog(type: string, message: string, context?: unknown): Log {
    return {
      type,
      message,
      context,
    };
  }

  errorData(error: unknown): unknown {
    if (error instanceof Error) {
      return { message: error.message, stack: error.stack };
    }
    return { message: String(error) };
  }

  debug(type: string, message: string, context?: unknown): void {
    this.pino.debug(this.createLog(type, message, context));
  }

  info(type: string, message: string, context?: unknown): void {
    this.pino.info(this.createLog(type, message, context));
  }

  warn(type: string, message: string, context?: unknown): void {
    this.pino.warn(this.createLog(type, message, context));
  }

  error(type: string, message: string, context?: unknown): void {
    this.pino.error(this.createLog(type, message, context));
  }

  fatal(type: string, message: string, context?: unknown): void {
    this.pino.fatal(this.createLog(type, message, context));
  }
}

export * from './config';
