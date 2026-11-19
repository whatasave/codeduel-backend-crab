import type { HealthService } from './service';
import { Type } from '@sinclair/typebox';
import { LivenessStatus, ReadinessStatus } from './data';
import { route, routes, type NodeBuilder } from '@glass-cannon/router';
import { validated } from '@glass-cannon/typebox';

export class HealthController {
  constructor(private readonly HealthService: HealthService) {}

  setup(): NodeBuilder {
    return routes().use(this.health).use(this.livenessCheck).use(this.readinessCheck);
  }

  health = route(
    validated({
      method: 'GET',
      path: '/',
      schema: {
        response: {
          200: Type.Object({
            status: LivenessStatus,
          }),
        },
      },
      handler: async () => {
        const status = this.HealthService.livenessCheck();

        return { status: 200, body: { status } };
      },
    })
  );

  livenessCheck = route(
    validated({
      method: 'GET',
      path: '/liveness',
      schema: {
        response: {
          200: Type.Object({
            status: LivenessStatus,
          }),
        },
      },
      handler: async () => {
        const status = this.HealthService.livenessCheck();

        return { status: 200, body: { status } };
      },
    })
  );

  readinessCheck = route(
    validated({
      method: 'GET',
      path: '/readiness',
      schema: {
        response: {
          200: Type.Object({
            status: ReadinessStatus,
          }),
        },
      },
      handler: async () => {
        const status = this.HealthService.readinessCheck();

        return { status: 200, body: { status } };
      },
    })
  );
}
