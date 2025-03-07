import type { HealthService } from './service';
import { route, type BackendRouterGroup } from '../../router';
import { Type } from '@sinclair/typebox';
import { LivenessStatus, ReadinessStatus } from './data';

export class HealthController {
  constructor(private readonly HealthService: HealthService) {}

  setup(group: BackendRouterGroup): void {
    group.route(this.livenessCheck);
    group.route(this.readinessCheck);
  }

  livenessCheck = route({
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

  readinessCheck = route({
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
