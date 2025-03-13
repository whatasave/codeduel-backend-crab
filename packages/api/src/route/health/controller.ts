import type { HealthService } from './service';
import { Type } from '@sinclair/typebox';
import { LivenessStatus, ReadinessStatus } from './data';
import { validated } from '@codeduel-backend-crab/server/validation';
import type { RouterGroup } from '@codeduel-backend-crab/server';

export class HealthController {
  constructor(private readonly HealthService: HealthService) {}

  setup(group: RouterGroup): void {
    group.route(this.livenessCheck);
    group.route(this.readinessCheck);
  }

  livenessCheck = validated({
    method: 'GET',
    path: '/liveness',
    schema: {
      request: {},
      response: {
        200: Type.Object({
          status: LivenessStatus,
        }),
      },
    },
    handler: async () => {
      return {
        status: 200,
        body: { status: this.HealthService.livenessCheck() },
      } as const;
    },
  });

  readinessCheck = validated({
    method: 'GET',
    path: '/readiness',
    schema: {
      request: {},
      response: {
        200: Type.Object({
          status: ReadinessStatus,
        }),
      },
    },
    handler: async () => {
      return {
        status: 200,
        body: { status: this.HealthService.readinessCheck() },
      } as const;
    },
  });
}
