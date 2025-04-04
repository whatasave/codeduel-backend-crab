import type { RouterGroup } from '@codeduel-backend-crab/server';
import { HealthController } from './health/controller';
import { HealthService } from './health/service';
import { RedocController } from './redoc/controller';

export class RootController {
  private readonly healthService = new HealthService();

  private readonly redocController = new RedocController();
  private readonly healthController = new HealthController(this.healthService);

  setup(group: RouterGroup): void {
    this.redocController.setup(group.group({ prefix: '/redoc' }));
    this.healthController.setup(group.group({ prefix: '/health' }));
  }
}
