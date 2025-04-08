import { Type, type Static } from '@sinclair/typebox';
import { Config as GithubConfig } from './github/config';

export type Config = Static<typeof Config>;
export const Config = Type.Object({
  github: GithubConfig,
});
