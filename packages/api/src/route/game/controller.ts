import type { GameService } from './service';
import { CreateGame, Game, GameOfUser, GameWithUserData, ShareCode, UpdateGameUser } from './data';
import { Type } from '@sinclair/typebox';
import { User } from '../user/data';
import { route } from '../../utils/route';
import type { TypeBoxGroup } from '@glass-cannon/typebox';

export class GameController {
  constructor(private readonly gameService: GameService) {}

  setup(group: TypeBoxGroup): void {
    this.byId(group);
    this.create(group);
    this.submit(group);
    this.endGame(group);
    this.shareCode(group);
    this.byUserId(group);
  }

  byId = route({
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
    handler: async ({ params }) => {
      const game = await this.gameService.byId(params.id);
      if (!game) return { status: 404 };

      return { status: 200, body: game };
    },
  });

  create = route({
    method: 'POST',
    path: '/',
    schema: {
      body: CreateGame,
      response: {
        201: GameWithUserData,
      },
    },
    handler: async ({ body }) => {
      const game = await this.gameService.create(body);

      return { status: 201, body: game };
    },
  });

  submit = route({
    method: 'POST',
    path: '/submit',
    schema: {
      body: UpdateGameUser,
      response: {
        204: Type.Undefined(),
      },
    },
    handler: async ({ body }) => {
      await this.gameService.updateSubmission(body);

      return { status: 204 };
    },
  });

  endGame = route({
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
    handler: async ({ params }) => {
      await this.gameService.endGame(params.id);

      return { status: 204 };
    },
  });

  shareCode = route({
    method: 'POST',
    path: '/sharecode',
    schema: {
      body: ShareCode,
      response: {
        204: Type.Undefined(),
      },
    },
    handler: async ({ body }) => {
      await this.gameService.shareCode(body);

      return { status: 204 };
    },
  });

  byUserId = route({
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
    handler: async ({ params }) => {
      const games = await this.gameService.byUserId(params.id);

      return { status: 200, body: games };
    },
  });
}
