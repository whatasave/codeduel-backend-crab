import type { RouterGroup } from '@codeduel-backend-crab/server/router';
import { HealthController } from './health/controller';
import { HealthService } from './health/service';

export class RootController {
  private readonly healthService = new HealthService();

  private readonly healthController = new HealthController(this.healthService);

  setup(group: RouterGroup): void {
    this.healthController.setup(group.group({ prefix: '/health' }));
  }
}
