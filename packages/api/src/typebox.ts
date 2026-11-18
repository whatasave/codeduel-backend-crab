import type { Plugin } from '@glass-cannon/router';
import { json } from '@glass-cannon/server-bun';
import { typebox } from '@glass-cannon/typebox';

export function setupTypebox(descriptiveErrors: boolean): Plugin {
  return typebox({
    onInvalidRequest: ({ errors }) =>
      descriptiveErrors
        ? json({ status: 400, body: { errors } })
        : new Response(null, { status: 400 }),
  });
}
