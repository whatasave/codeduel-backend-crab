import type { Logger } from '@codeduel-backend-crab/logger';
import { route, routes, type NodeBuilder } from '@glass-cannon/router';
import { validated } from '@glass-cannon/typebox';
import { Type } from '@sinclair/typebox';

import { loggerDecorator } from '@/middleware/logger';
import type { AuthMiddleware } from '@/route/auth/middleware';
import { User } from '@/route/user/data';

import {
  CreateGame,
  Game,
  GameWithUserData,
  GameWithUsersData,
  ShareCodeRequest,
  UpdateSubmission,
} from './data';
import type { GameService } from './service';

export class GameController {
  constructor(
    private readonly gameService: GameService,
    private readonly authMiddleware: AuthMiddleware,
    private readonly logger: Logger
  ) {}

  setup(): NodeBuilder {
    return routes({ middleware: loggerDecorator(this.logger) })
      .use(this.all)
      .use(this.create)
      .use(this.byUniqueId)
      .use(this.results)
      .use(this.submit)
      .use(this.endGame)
      .use(this.shareCode())
      .use(this.byUserId);
  }

  all = route<{ logger: Logger }>(
    validated({
      method: 'GET',
      path: '/',
      schema: {
        response: {
          200: Type.Array(GameWithUsersData),
        },
      },
      handler: async ({ logger }) => {
        return { status: 200, body: await this.gameService.all(logger) };
      },
    })
  );

  create = route<{ logger: Logger }>(
    validated({
      method: 'POST',
      path: '/',
      schema: {
        body: CreateGame,
        response: {
          200: GameWithUsersData,
          409: Type.Undefined(),
        },
      },
      handler: async ({ body, logger }) => {
        const game = await this.gameService.create(body, logger);
        if (!game) return { status: 409 };

        return { status: 200, body: game };
      },
    })
  );

  byUniqueId = route<{ logger: Logger }>(
    validated({
      method: 'GET',
      path: '/:uniqueId',
      schema: {
        params: { uniqueId: Game.properties.uniqueId },
        response: {
          200: GameWithUsersData,
          404: Type.Undefined(),
        },
      },
      handler: async ({ params, logger }) => {
        const game = await this.gameService.byUniqueId(params.uniqueId, logger);
        if (!game) return { status: 404 };

        return { status: 200, body: game };
      },
    })
  );

  results = route<{ logger: Logger }>(
    validated({
      method: 'GET',
      path: '/:uniqueId/results',
      schema: {
        params: { uniqueId: Game.properties.uniqueId },
        response: {
          200: GameWithUsersData,
          404: Type.Undefined(),
        },
      },
      handler: async ({ params, logger }) => {
        const game = await this.gameService.byUniqueId(params.uniqueId, logger);
        if (!game) return { status: 404 };

        return { status: 200, body: game };
      },
    })
  );

  submit = route<{ logger: Logger }>(
    validated({
      method: 'PATCH',
      path: '/:uniqueId/submit',
      schema: {
        params: { uniqueId: Game.properties.uniqueId },
        body: UpdateSubmission,
        response: {
          204: Type.Undefined(),
          404: Type.Undefined(),
        },
      },
      handler: async ({ params, body, logger }) => {
        const updated = await this.gameService.updateSubmission(params.uniqueId, body, logger);
        if (!updated) return { status: 404 };

        return { status: 204 };
      },
    })
  );

  endGame = route<{ logger: Logger }>(
    validated({
      method: 'PATCH',
      path: '/:uniqueId/endgame',
      schema: {
        params: { uniqueId: Game.properties.uniqueId },
        response: {
          204: Type.Undefined(),
          404: Type.Undefined(),
        },
      },
      handler: async ({ params, logger }) => {
        const ended = await this.gameService.endGame(params.uniqueId, logger);
        if (!ended) return { status: 404 };

        return { status: 204 };
      },
    })
  );

  shareCode(): NodeBuilder<{ logger: Logger }> {
    return route<{ logger: Logger }>(
      validated({
        method: 'PATCH',
        path: '/sharecode',
        middleware: this.authMiddleware.requireAuth(),
        schema: {
          body: ShareCodeRequest,
          response: {
            204: Type.Undefined(),
            404: Type.Undefined(),
          },
        },
        handler: async ({ body, user, logger }) => {
          const updated = await this.gameService.shareCode(
            body.lobbyId,
            user.id,
            body.showCode,
            logger
          );
          if (!updated) return { status: 404 };

          return { status: 204 };
        },
      })
    );
  }

  byUserId = route<{ logger: Logger }>(
    validated({
      method: 'GET',
      path: '/user/:userId',
      schema: {
        params: { userId: User.properties.id },
        response: {
          200: Type.Array(GameWithUserData),
        },
      },
      handler: async ({ params, logger }) => {
        const games = await this.gameService.byUserId(params.userId, logger);

        return { status: 200, body: games };
      },
    })
  );
}
