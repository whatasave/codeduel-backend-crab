import type { Logger } from '@codeduel-backend-crab/logger';

import type { CreateUser } from '@/route/user/data';

export interface AuthProvider {
  authorizationUrl(state: string, logger?: Logger): string;
  createUser(
    query: Record<string, string>,
    logger?: Logger
  ): Promise<{ providerId: number; createUser: CreateUser }>;
}
