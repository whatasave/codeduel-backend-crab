import type { Request } from './request';
import type { Response } from './response';

export interface ListenOptions {
  host: string;
  port: number;
}

export interface Server {
  listen(options: ListenOptions): RunningServer;
  handle(request: Request): Promise<Response>;
}

export interface RunningServer {
  stop(): Promise<void>;
}
