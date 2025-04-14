import { validated } from '@codeduel-backend-crab/server/validation';
import { Challenge, ChallengeDetailed, CreateChallenge, UpdateChallenge } from './data';
import type { ChallengeService } from './service';
import { Type } from '@sinclair/typebox';
import {
  conflict,
  created,
  noContent,
  notFound,
  ok,
  type RouterGroup,
} from '@codeduel-backend-crab/server';

export class ChallengeController {
  constructor(private readonly challengeService: ChallengeService) {}

  setup(group: RouterGroup): void {
    group.route(this.byId);
    group.route(this.all);
    group.route(this.create);
    group.route(this.update);
    group.route(this.delete);
    group.route(this.random);
  }

  byId = validated({
    method: 'GET',
    path: '/:id',
    schema: {
      request: {
        params: { id: Type.Number() },
      },
      response: {
        200: ChallengeDetailed,
        404: Type.Undefined(),
      },
    },
    handler: async ({ params }) => {
      const { id } = params;
      const challenge = await this.challengeService.findById(id);
      if (!challenge) return notFound();
      return ok(challenge);
    },
  });

  all = validated({
    method: 'GET',
    path: '/',
    schema: {
      request: {},
      response: {
        200: Type.Array(Challenge),
      },
    },
    handler: async () => {
      return ok(await this.challengeService.findAll());
    },
  });

  create = validated({
    method: 'POST',
    path: '/',
    schema: {
      request: {
        body: CreateChallenge,
      },
      response: {
        201: Challenge,
        409: Type.Undefined(),
      },
    },
    handler: async ({ body }) => {
      const challenge = await this.challengeService.create(body);
      if (!challenge) return conflict();
      return created(challenge);
    },
  });

  update = validated({
    method: 'PUT',
    path: '/',
    schema: {
      request: {
        body: UpdateChallenge,
      },
      response: {
        200: Challenge,
        404: Type.Undefined(),
      },
    },
    handler: async ({ body }) => {
      const challenge = await this.challengeService.update(body);
      if (!challenge) return notFound();
      return ok(challenge);
    },
  });

  delete = validated({
    method: 'DELETE',
    path: '/:id',
    schema: {
      request: {
        params: { id: Type.Number() },
      },
      response: {
        204: Type.Undefined(),
        404: Type.Undefined(),
      },
    },
    handler: async ({ params }) => {
      const { id } = params;
      const deleted = await this.challengeService.delete(id);
      if (!deleted) return notFound();
      return noContent();
    },
  });

  random = validated({
    method: 'GET',
    path: '/random',
    schema: {
      request: {},
      response: {
        200: Challenge,
        404: Type.Undefined(),
      },
    },
    handler: async () => {
      const challenge = await this.challengeService.findRandom();
      if (!challenge) return notFound();
      return ok(challenge);
    },
  });
}
