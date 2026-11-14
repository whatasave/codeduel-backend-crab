import type { TypeBoxGroup } from '@glass-cannon/typebox';
import { route } from '../../utils/route';
import {
  ChallengeWithUser,
  ChallengeWithUserAndTestCases,
  CreateChallenge,
  UpdateChallenge,
  Challenge,
} from './data';
import type { ChallengeService } from './service';
import { Type } from '@sinclair/typebox';
import type { Logger } from '@codeduel-backend-crab/logger';
import { loggerDecorator } from '../../middleware/logger';

export class ChallengeController {
  constructor(
    private readonly challengeService: ChallengeService,
    private readonly logger: Logger
  ) {}

  setup(group: TypeBoxGroup): void {
    this.byId(group);
    this.all(group);
    this.create(group);
    this.update(group);
    this.delete(group);
    this.random(group);
  }

  byId = route(() => ({
    method: 'GET',
    path: '/:id',
    middleware: loggerDecorator(this.logger),
    schema: {
      params: { id: Type.Number() },
      response: {
        200: ChallengeWithUserAndTestCases,
        404: Type.Undefined(),
      },
    },
    handler: async ({ params, logger }) => {
      const { id } = params;
      const challenge = await this.challengeService.byId(id, logger);
      if (!challenge) return { status: 404 };
      return { status: 200, body: challenge };
    },
  }));

  all = route(() => ({
    method: 'GET',
    path: '/',
    middleware: loggerDecorator(this.logger),
    schema: {
      request: {},
      response: {
        200: Type.Array(ChallengeWithUser),
      },
    },
    handler: async ({ logger }) => {
      return { status: 200, body: await this.challengeService.all(logger) };
    },
  }));

  create = route(() => ({
    method: 'POST',
    path: '/',
    middleware: loggerDecorator(this.logger),
    schema: {
      body: CreateChallenge,
      response: {
        201: Challenge,
        409: Type.Undefined(),
      },
    },
    handler: async ({ body, logger }) => {
      const challenge = await this.challengeService.create(body, logger);
      if (!challenge) return { status: 409 };
      return { status: 201, body: challenge };
    },
  }));

  update = route(() => ({
    method: 'PUT',
    path: '/',
    middleware: loggerDecorator(this.logger),
    schema: {
      body: UpdateChallenge,
      response: {
        200: Challenge,
        404: Type.Undefined(),
      },
    },
    handler: async ({ body, logger }) => {
      const challenge = await this.challengeService.update(body, logger);
      if (!challenge) return { status: 404 };
      return { status: 200, body: challenge };
    },
  }));

  delete = route(() => ({
    method: 'DELETE',
    path: '/:id',
    middleware: loggerDecorator(this.logger),
    schema: {
      params: { id: Type.Number() },
      response: {
        204: Type.Undefined(),
        404: Type.Undefined(),
      },
    },
    handler: async ({ params, logger }) => {
      const { id } = params;
      const deleted = await this.challengeService.delete(id, logger);
      if (!deleted) return { status: 404 };
      return { status: 204 };
    },
  }));

  random = route(() => ({
    method: 'GET',
    path: '/random',
    middleware: loggerDecorator(this.logger),
    schema: {
      response: {
        200: ChallengeWithUserAndTestCases,
        404: Type.Undefined(),
      },
    },
    handler: async ({ logger }) => {
      const challenge = await this.challengeService.random(logger);
      if (!challenge) return { status: 404 };
      return { status: 200, body: challenge };
    },
  }));
}
