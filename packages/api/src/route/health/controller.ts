import type { Request, Response, RouterGroup } from '@codeduel-backend-crab/server';
import type { HealthService } from './service';
import type { BackendRouterGroup } from '../../router';
import { Type } from '@sinclair/typebox';
import { LivenessStatus, ReadinessStatus } from './data';

export class HealthController {
  constructor(private readonly HealthService: HealthService) {}

  setup(group: BackendRouterGroup): void {
    group.route({
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
      handler: this.livenessCheck.bind(this),
    });

    group.route({
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
      handler: this.readinessCheck.bind(this),
    });
  }

  async livenessCheck(_: Request): Promise<Response> {
    return {
      status: 200,
      body: { status: this.HealthService.livenessCheck() },
    } as const;
  }

  async readinessCheck(_: Request): Promise<Response> {
    return {
      status: 200,
      body: { status: this.HealthService.readinessCheck() },
    } as const;
  }
}
