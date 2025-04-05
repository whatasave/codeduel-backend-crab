import type { RouterGroup } from '@codeduel-backend-crab/server';
import { HealthController } from './health/controller';
import { HealthService } from './health/service';
import { RedocController } from './redoc/controller';
import { UserController } from './user/controller';
import { UserRepository } from './user/repository';
import { UserService } from './user/service';

export class RootController {
  private readonly userRepository = new UserRepository();

  private readonly healthService = new HealthService();
  private readonly userService = new UserService(this.userRepository);

  private readonly redocController = new RedocController();
  private readonly healthController = new HealthController(this.healthService);
  private readonly userController = new UserController(this.userService);

  setup(group: RouterGroup): void {
    this.redocController.setup(group.group({ prefix: '/redoc' }));
    this.healthController.setup(group.group({ prefix: '/health' }));
    this.userController.setup(group.group({ prefix: '/user' }));
  }
}
