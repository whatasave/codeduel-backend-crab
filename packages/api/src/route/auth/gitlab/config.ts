import { Type, type Static } from '@sinclair/typebox';

export type Config = Static<typeof Config>;
export const Config = Type.Object({
  applicationId: Type.String(),
  secret: Type.String(),
});
