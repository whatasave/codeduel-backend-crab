import type { GameService } from './service';
import { CreateGame, Game, GameOfUser, GameWithUserData, ShareCode, UpdateGameUser } from './data';
import { Type } from '@sinclair/typebox';
import { User } from '../user/data';
import { route } from '../../utils/route';
import type { TypeBoxGroup } from '@glass-cannon/typebox';
import type { Logger } from '@codeduel-backend-crab/logger';
import { loggerDecorator } from '../../middleware/logger';

export class GameController {
  constructor(
    private readonly gameService: GameService,
    private readonly logger: Logger
  ) {}

  setup(group: TypeBoxGroup): void {
    this.byId(group);
    this.create(group);
    this.submit(group);
    this.endGame(group);
    this.shareCode(group);
    this.byUserId(group);
  }

  byId = route(() => ({
    method: 'GET',
    path: '/:id',
    middleware: loggerDecorator(this.logger),
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
  }));

  create = route(() => ({
    method: 'POST',
    path: '/',
    middleware: loggerDecorator(this.logger),
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
  }));

  submit = route(() => ({
    method: 'POST',
    path: '/submit',
    middleware: loggerDecorator(this.logger),
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
  }));

  endGame = route(() => ({
    method: 'POST',
    path: '/:id/end',
    middleware: loggerDecorator(this.logger),
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
  }));

  shareCode = route(() => ({
    method: 'POST',
    path: '/sharecode',
    middleware: loggerDecorator(this.logger),
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
  }));

  byUserId = route(() => ({
    method: 'GET',
    path: '/user/:id',
    middleware: loggerDecorator(this.logger),
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
  }));
}
