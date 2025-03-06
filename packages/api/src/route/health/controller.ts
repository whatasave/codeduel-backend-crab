import type { Request, RouterGroup } from '@codeduel-backend-crab/server';
import type { HealthService } from './service';

export class HealthController {
  constructor(private readonly HealthService: HealthService) {}

  setup(group: RouterGroup) {
    group.route({
      method: 'GET',
      path: '/liveness',
      handler: this.livenessCheck.bind(this),
    });

    group.route({
      method: 'GET',
      path: '/readiness',
      handler: this.readinessCheck.bind(this),
    });
  }

  async livenessCheck(_: Request) {
    return {
      status: 200,
      body: this.HealthService.livenessCheck(),
    };
  }

  async readinessCheck(_: Request) {
    return {
      status: 200,
      body: this.HealthService.readinessCheck(),
    };
  }
}
