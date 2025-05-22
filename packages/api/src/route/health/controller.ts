import type { HealthService } from './service';
import { Type } from '@sinclair/typebox';
import { LivenessStatus, ReadinessStatus } from './data';
import type { TypeBoxGroup } from '@glass-cannon/typebox';
import { route } from '../../utils/route';

export class HealthController {
  constructor(private readonly HealthService: HealthService) {}

  setup(group: TypeBoxGroup): void {
    this.livenessCheck(group);
    this.readinessCheck(group);
  }

  livenessCheck = route({
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
  });

  readinessCheck = route({
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
  });
}
