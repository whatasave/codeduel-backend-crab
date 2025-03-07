import type { Request, Response } from './types';

export interface ListenOptions {
  host: string;
  port: number;
}

export interface Server {
  listen(options: ListenOptions): RunningServer;
  handle(request: Request): Promise<Response>;
}

export interface RunningServer {
  url: URL;
  host: string;
  port: number;
  stop(): Promise<void>;
}
