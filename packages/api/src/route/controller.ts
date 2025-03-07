import { HealthController } from './health/controller';
import { HealthService } from './health/service';
import type { BackendRouterGroup } from '../router';

export class RootController {
  private readonly healthService = new HealthService();

  private readonly healthController = new HealthController(this.healthService);

  setup(group: BackendRouterGroup): void {
    this.healthController.setup(group.group({ prefix: '/health' }));
  }
}
