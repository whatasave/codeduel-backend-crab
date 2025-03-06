import { Type, Static } from '@sinclair/typebox';
import { Value, AssertError } from '@sinclair/typebox/value';

const Config = Type.Object({
  host: Type.String(),
  port: Type.Number({ minimum: 0, maximum: 65535 }),
});

export type Config = Static<typeof Config>;

export function loadConfigFromEnv():
  | { config: Config; error: undefined }
  | { config: undefined; error: string } {
  const config = {
    host: process.env.HOST ?? 'localhost',
    port: process.env.PORT ?? '0',
  };

  try {
    return { config: Value.Parse(Config, config), error: undefined };
  } catch (error) {
    if (error instanceof AssertError && error.error) {
      return { config: undefined, error: `${error.error.path}: ${error.error.message}` };
    }
    throw error;
  }
}
