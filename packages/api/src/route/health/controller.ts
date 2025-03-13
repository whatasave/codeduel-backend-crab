import type { HealthService } from './service';
import { Type } from '@sinclair/typebox';
import { LivenessStatus, ReadinessStatus } from './data';
import { validated } from '@codeduel-backend-crab/server/validation';
import { ok, type RouterGroup } from '@codeduel-backend-crab/server';

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
      return ok({ status: this.HealthService.livenessCheck() });
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
      return ok({ status: this.HealthService.readinessCheck() });
    },
  });
}
