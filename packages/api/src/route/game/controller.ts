import type { GameService } from './service';
import { CreateGame, Game, GameOfUser, GameWithUserData, ShareCode, UpdateGameUser } from './data';
import { Type } from '@sinclair/typebox';
import { User } from '../user/data';
import { route, routes, type NodeBuilder } from '@glass-cannon/router';
import { validated } from '@glass-cannon/typebox';
import type { Logger } from '@codeduel-backend-crab/logger';
import { loggerDecorator } from '../../middleware/logger';

export class GameController {
  constructor(
    private readonly gameService: GameService,
    private readonly logger: Logger
  ) {}

  setup(): NodeBuilder {
    return routes({ middleware: loggerDecorator(this.logger) })
      .use(this.byId)
      .use(this.create)
      .use(this.submit)
      .use(this.endGame)
      .use(this.shareCode)
      .use(this.byUserId);
  }

  byId = route<{ logger: Logger }>(
    validated({
      method: 'GET',
      path: '/:id',
      schema: {
        params: {
          id: Game.properties.id,
        },
        response: {
          200: GameWithUserData,
          404: Type.Undefined(),
        },
      },
      handler: async ({ params, logger }) => {
        const game = await this.gameService.byId(params.id, logger);
        if (!game) return { status: 404 };

        return { status: 200, body: game };
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
          201: GameWithUserData,
        },
      },
      handler: async ({ body, logger }) => {
        const game = await this.gameService.create(body, logger);

        return { status: 201, body: game };
      },
    })
  );

  submit = route<{ logger: Logger }>(
    validated({
      method: 'POST',
      path: '/submit',
      schema: {
        body: UpdateGameUser,
        response: {
          204: Type.Undefined(),
        },
      },
      handler: async ({ body, logger }) => {
        await this.gameService.updateSubmission(body, logger);

        return { status: 204 };
      },
    })
  );

  endGame = route<{ logger: Logger }>(
    validated({
      method: 'POST',
      path: '/:id/end',
      schema: {
        params: {
          id: User.properties.id,
        },
        response: {
          204: Type.Undefined(),
        },
      },
      handler: async ({ params, logger }) => {
        await this.gameService.endGame(params.id, logger);

        return { status: 204 };
      },
    })
  );

  shareCode = route<{ logger: Logger }>(
    validated({
      method: 'POST',
      path: '/sharecode',
      schema: {
        body: ShareCode,
        response: {
          204: Type.Undefined(),
        },
      },
      handler: async ({ body, logger }) => {
        await this.gameService.shareCode(body, logger);

        return { status: 204 };
      },
    })
  );

  byUserId = route<{ logger: Logger }>(
    validated({
      method: 'GET',
      path: '/user/:id',
      schema: {
        params: {
          id: User.properties.id,
        },
        response: {
          200: Type.Array(GameOfUser),
        },
      },
      handler: async ({ params, logger }) => {
        const games = await this.gameService.byUserId(params.id, logger);

        return { status: 200, body: games };
      },
    })
  );
}
