import { route, routes, type NodeBuilder } from '@glass-cannon/router';
import { validated } from '@glass-cannon/typebox';
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

  setup(): NodeBuilder {
    return routes({ middleware: loggerDecorator(this.logger) })
      .use(this.byId)
      .use(this.all)
      .use(this.create)
      .use(this.update)
      .use(this.delete)
      .use(this.random);
  }

  byId = route<{ logger: Logger }>(
    validated({
      method: 'GET',
      path: '/:id',
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
    })
  );

  all = route<{ logger: Logger }>(
    validated({
      method: 'GET',
      path: '/',
      schema: {
        response: {
          200: Type.Array(ChallengeWithUser),
        },
      },
      handler: async ({ logger }) => {
        return { status: 200, body: await this.challengeService.all(logger) };
      },
    })
  );

  create = route<{ logger: Logger }>(
    validated({
      method: 'POST',
      path: '/',
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
    })
  );

  update = route<{ logger: Logger }>(
    validated({
      method: 'PUT',
      path: '/',
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
    })
  );

  delete = route<{ logger: Logger }>(
    validated({
      method: 'DELETE',
      path: '/:id',
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
    })
  );

  random = route<{ logger: Logger }>(
    validated({
      method: 'GET',
      path: '/random',
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
    })
  );
}
