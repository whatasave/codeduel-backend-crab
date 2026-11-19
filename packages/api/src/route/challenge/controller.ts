import type { Logger } from '@codeduel-backend-crab/logger';
import { route, routes, type NodeBuilder } from '@glass-cannon/router';
import { validated } from '@glass-cannon/typebox';
import { Type } from '@sinclair/typebox';

import { loggerDecorator } from '@/middleware/logger';
import type { SessionUser } from '@/route/auth/data';
import type { AuthMiddleware } from '@/route/auth/middleware';
import type { Permissions } from '@/route/permission/permissions';

import { ChallengeBody, ChallengeDetailed, ChallengeSummary, Challenge } from './data';
import type { ChallengeService } from './service';

export class ChallengeController {
  constructor(
    private readonly challengeService: ChallengeService,
    private readonly authMiddleware: AuthMiddleware,
    private readonly logger: Logger
  ) {}

  setup(): NodeBuilder {
    return routes({ middleware: loggerDecorator(this.logger) })
      .use(this.byId)
      .use(this.all)
      .use(this.create())
      .use(this.update())
      .use(this.delete())
      .use(this.random);
  }

  byId = route<{ logger: Logger }>(
    validated({
      method: 'GET',
      path: '/:id',
      schema: {
        params: { id: Challenge.properties.id },
        response: {
          200: ChallengeSummary,
          404: Type.Undefined(),
        },
      },
      handler: async ({ params, logger }) => {
        const challenge = await this.challengeService.byId(params.id, logger);
        if (!challenge) return { status: 404 };
        return { status: 200, body: challenge };
      },
    })
  );

  all = route<{ logger: Logger }>(
    validated({
      method: 'GET',
      path: '/',
      schema: {
        response: {
          200: Type.Array(ChallengeSummary),
        },
      },
      handler: async ({ logger }) => {
        return { status: 200, body: await this.challengeService.all(logger) };
      },
    })
  );

  create(): NodeBuilder<{ logger: Logger }> {
    return route<{ logger: Logger }>(
      validated({
        method: 'POST',
        path: '/',
        middleware: this.authMiddleware.requirePermission({
          resource: 'challenge',
          name: 'create',
        }),
        schema: {
          body: ChallengeBody,
          response: {
            200: ChallengeSummary,
          },
        },
        handler: async ({ body, user, logger }) => {
          const created = await this.challengeService.create({ ...body, ownerId: user.id }, logger);
          const challenge = await this.challengeService.byId(created.id, logger);
          if (!challenge) throw new Error('Challenge not found after creation');
          return { status: 200, body: challenge };
        },
      })
    );
  }

  update(): NodeBuilder<{ logger: Logger }> {
    return route<{ logger: Logger }>(
      validated({
        method: 'PUT',
        path: '/:id',
        middleware: this.authMiddleware.requireAuth(),
        schema: {
          params: { id: Challenge.properties.id },
          body: ChallengeBody,
          response: {
            204: Type.Undefined(),
            403: Type.Undefined(),
            404: Type.Undefined(),
          },
        },
        handler: async ({ params, body, user, permissions, logger }) => {
          const existing = await this.challengeService.byId(params.id, logger);
          if (!existing) return { status: 404 };
          if (!canModify(user, permissions, existing.owner.id, 'update')) return { status: 403 };

          const updated = await this.challengeService.update({ ...body, id: params.id }, logger);
          if (!updated) return { status: 404 };
          return { status: 204 };
        },
      })
    );
  }

  delete(): NodeBuilder<{ logger: Logger }> {
    return route<{ logger: Logger }>(
      validated({
        method: 'DELETE',
        path: '/:id',
        middleware: this.authMiddleware.requireAuth(),
        schema: {
          params: { id: Challenge.properties.id },
          response: {
            204: Type.Undefined(),
            403: Type.Undefined(),
            404: Type.Undefined(),
          },
        },
        handler: async ({ params, user, permissions, logger }) => {
          const existing = await this.challengeService.byId(params.id, logger);
          if (!existing) return { status: 404 };
          if (!canModify(user, permissions, existing.owner.id, 'delete')) return { status: 403 };

          const deleted = await this.challengeService.delete(params.id, logger);
          if (!deleted) return { status: 404 };
          return { status: 204 };
        },
      })
    );
  }

  random = route<{ logger: Logger }>(
    validated({
      method: 'GET',
      path: '/random',
      schema: {
        response: {
          200: ChallengeDetailed,
          404: Type.Undefined(),
        },
      },
      handler: async ({ logger }) => {
        const challenge = await this.challengeService.random(logger);
        if (!challenge) return { status: 404 };
        return { status: 200, body: challenge };
      },
    })
  );
}

function canModify(
  user: SessionUser,
  permissions: Permissions,
  ownerId: number,
  action: 'update' | 'delete'
): boolean {
  if (permissions.has(`${action}:any`, 'challenge')) return true;
  return ownerId === user.id && permissions.has(`${action}:own`, 'challenge');
}
