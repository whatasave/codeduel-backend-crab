import type { Logger } from '@codeduel-backend-crab/logger';

import type { CreateUser } from '@/route/user/data';

export interface AuthProvider {
  authorizationUrl(state: string, callbackUri: string, logger?: Logger): string;
  createUser(
    query: Record<string, string>,
    callbackUri: string,
    logger?: Logger
  ): Promise<{ providerId: number; createUser: CreateUser }>;
}
