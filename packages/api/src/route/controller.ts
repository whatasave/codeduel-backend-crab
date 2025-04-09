import type { RouterGroup } from '@codeduel-backend-crab/server';
import { HealthController } from './health/controller';
import { HealthService } from './health/service';
import { RedocController } from './redoc/controller';
import { UserController } from './user/controller';
import { UserRepository } from './user/repository';
import { UserService } from './user/service';
import type { Database } from '@codeduel-backend-crab/database';

export class RootController {
  private readonly userRepository: UserRepository;
  private readonly challengeRepository: UserRepository;

  private readonly healthService: HealthService;
  private readonly userService: UserService;
  private readonly challengeService: UserService;

  private readonly redocController: RedocController;
  private readonly healthController: HealthController;
  private readonly userController: UserController;
  private readonly challengeController: UserController;

  constructor(database: Database) {
    this.userRepository = new UserRepository(database);
    this.challengeRepository = new UserRepository(database);

    this.healthService = new HealthService();
    this.userService = new UserService(this.userRepository);
    this.challengeService = new UserService(this.challengeRepository);

    this.redocController = new RedocController();
    this.healthController = new HealthController(this.healthService);
    this.userController = new UserController(this.userService);
    this.challengeController = new UserController(this.challengeService);
  }

  setup(group: RouterGroup): void {
    this.redocController.setup(group.group({ prefix: '/redoc' }));
    this.healthController.setup(group.group({ prefix: '/health' }));
    this.userController.setup(group.group({ prefix: '/user' }));
    this.challengeController.setup(group.group({ prefix: '/challenge' }));
  }
}
