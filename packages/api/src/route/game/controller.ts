import { created, noContent, notFound, ok, type RouterGroup } from '@codeduel-backend-crab/server';
import type { GameService } from './service';
import { validated } from '@codeduel-backend-crab/server/validation';
import { CreateGame, Game, GameOfUser, GameWithUserData, ShareCode, UpdateGameUser } from './data';
import { Type } from '@sinclair/typebox';
import { User } from '../user/data';

export class GameController {
  constructor(private readonly gameService: GameService) {}

  setup(group: RouterGroup): void {
    group.route(this.byId);
    group.route(this.create);
    group.route(this.submit);
    group.route(this.endGame);
    group.route(this.shareCode);
    group.route(this.byUserId);
  }

  byId = validated({
    method: 'GET',
    path: '/:id',
    schema: {
      request: {
        params: {
          id: Game.properties.id,
        },
      },
      response: {
        200: GameWithUserData,
        404: Type.Undefined(),
      },
    },
    handler: async ({ params }) => {
      const game = await this.gameService.byId(params.id);
      if (!game) return notFound();

      return ok(game);
    },
  });

  create = validated({
    method: 'POST',
    path: '/',
    schema: {
      request: {
        body: CreateGame,
      },
      response: {
        201: GameWithUserData,
      },
    },
    handler: async ({ body }) => {
      const game = await this.gameService.create(body);

      return created(game);
    },
  });

  submit = validated({
    method: 'POST',
    path: '/submit',
    schema: {
      request: {
        body: UpdateGameUser,
      },
      response: {
        204: Type.Undefined(),
      },
    },
    handler: async ({ body }) => {
      await this.gameService.updateSubmission(body);
      return noContent();
    },
  });

  endGame = validated({
    method: 'POST',
    path: '/:id/end',
    schema: {
      request: {
        params: {
          id: User.properties.id,
        },
      },
      response: {
        204: Type.Undefined(),
      },
    },
    handler: async ({ params }) => {
      await this.gameService.endGame(params.id);
      return noContent();
    },
  });

  shareCode = validated({
    method: 'POST',
    path: '/sharecode',
    schema: {
      request: {
        body: ShareCode,
      },
      response: {
        204: Type.Undefined(),
      },
    },
    handler: async ({ body }) => {
      await this.gameService.shareCode(body);
      return noContent();
    },
  });

  byUserId = validated({
    method: 'GET',
    path: '/user/:id',
    schema: {
      request: {
        params: {
          id: User.properties.id,
        },
      },
      response: {
        200: Type.Array(GameOfUser),
      },
    },
    handler: async ({ params }) => {
      const games = await this.gameService.byUserId(params.id);
      return ok(games);
    },
  });
}
