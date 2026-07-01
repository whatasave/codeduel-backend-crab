import { randomBytes } from 'crypto';

export interface TraceContext {
  traceId: string;
  spanId: string;
  version: string;
  flags: string;
}

export function createTraceId(): string {
  return randomBytes(16).toString('hex');
}

export function createSpanId(): string {
  return randomBytes(8).toString('hex');
}

export function createTrace({
  traceId = createTraceId(),
  spanId = createSpanId(),
  version = '00',
  flags = '01',
}: {
  traceId?: string;
  spanId?: string;
  version?: string;
  flags?: string;
}): string {
  return `${version}-${traceId}-${spanId}-${flags}`;
}

export function parseTrace(header: string): TraceContext {
  const [version, traceId, spanId, flags] = header.split('-');
  if (!version || !traceId || !spanId || !flags)
    throw new Error(`Invalid traceparent format '${header}'`);
  if (version !== '00') throw new Error(`Unsupported traceparent version ${version}`);
  return { version, traceId, spanId, flags };
}
