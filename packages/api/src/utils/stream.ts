import { readJson, type RequestBody, type ResponseBody } from '@glass-cannon/server-bun';
import type { ReadableStream } from 'node:stream/web';
import { TransformStream } from 'node:stream/web';

export async function responseBodyToJson(stream: ResponseBody | undefined): Promise<unknown> {
  if (!stream) return undefined;
  const { readable, writable } = new TransformStream<Uint8Array>();
  void stream(writable).then(() => writable.close());
  return await readJson(readable as ReadableStream<Uint8Array>);
}

export function jsonToRequestBody(json: unknown): RequestBody {
  return new Response(JSON.stringify(json)).body as unknown as RequestBody;
}
