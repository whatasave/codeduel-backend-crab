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

export class ChallengeController {
  constructor(private readonly challengeService: ChallengeService) {}

  setup(group: TypeBoxGroup): void {
    this.byId(group);
    this.all(group);
    this.create(group);
    this.update(group);
    this.delete(group);
    this.random(group);
  }

  byId = route({
    method: 'GET',
    path: '/:id',
    schema: {
      params: { id: Type.Number() },
      response: {
        200: ChallengeWithUserAndTestCases,
        404: Type.Undefined(),
      },
    },
    handler: async ({ params }) => {
      const { id } = params;
      const challenge = await this.challengeService.byId(id);
      if (!challenge) return { status: 404 };
      return { status: 200, body: challenge };
    },
  });

  all = route({
    method: 'GET',
    path: '/',
    schema: {
      request: {},
      response: {
        200: Type.Array(ChallengeWithUser),
      },
    },
    handler: async () => {
      return { status: 200, body: await this.challengeService.all() };
    },
  });

  create = route({
    method: 'POST',
    path: '/',
    schema: {
      body: CreateChallenge,
      response: {
        201: Challenge,
        409: Type.Undefined(),
      },
    },
    handler: async ({ body }) => {
      const challenge = await this.challengeService.create(body);
      if (!challenge) return { status: 409 };
      return { status: 201, body: challenge };
    },
  });

  update = route({
    method: 'PUT',
    path: '/',
    schema: {
      body: UpdateChallenge,
      response: {
        200: Challenge,
        404: Type.Undefined(),
      },
    },
    handler: async ({ body }) => {
      const challenge = await this.challengeService.update(body);
      if (!challenge) return { status: 404 };
      return { status: 200, body: challenge };
    },
  });

  delete = route({
    method: 'DELETE',
    path: '/:id',
    schema: {
      params: { id: Type.Number() },
      response: {
        204: Type.Undefined(),
        404: Type.Undefined(),
      },
    },
    handler: async ({ params }) => {
      const { id } = params;
      const deleted = await this.challengeService.delete(id);
      if (!deleted) return { status: 404 };
      return { status: 204 };
    },
  });

  random = route({
    method: 'GET',
    path: '/random',
    schema: {
      response: {
        200: ChallengeWithUserAndTestCases,
        404: Type.Undefined(),
      },
    },
    handler: async () => {
      const challenge = await this.challengeService.random();
      if (!challenge) return { status: 404 };
      return { status: 200, body: challenge };
    },
  });
}
