import type { Database } from '@codeduel-backend-crab/database';
import type { Config } from '../config';
import { HealthController } from './health/controller';
import { HealthService } from './health/service';
import { ScalarController } from './scalar/controller';
import { UserController } from './user/controller';
import { UserRepository } from './user/repository';
import { UserService } from './user/service';
import { ChallengeRepository } from './challenge/repository';
import { ChallengeService } from './challenge/service';
import { ChallengeController } from './challenge/controller';
import { AuthRepository } from './auth/repository';
import { AuthService } from './auth/service';
import { AuthController } from './auth/controller';
import { GameRepository } from './game/repository';
import { GameService } from './game/service';
import { GameController } from './game/controller';
import type { TypeBoxGroup } from '@glass-cannon/typebox';
import { AuthMiddleware } from './auth/middleware';
import { PermissionRepository } from './permission/repository';
import { PermissionService } from './permission/service';

export class RootController {
  private readonly userRepository: UserRepository;
  private readonly challengeRepository: ChallengeRepository;
  private readonly authRepository: AuthRepository;
  private readonly gameRepository: GameRepository;
  private readonly permissionRepository: PermissionRepository;

  private readonly healthService: HealthService;
  private readonly userService: UserService;
  private readonly challengeService: ChallengeService;
  private readonly authService: AuthService;
  private readonly gameService: GameService;
  private readonly permissionService: PermissionService;

  private readonly scalarController: ScalarController;
  private readonly healthController: HealthController;
  private readonly userController: UserController;
  private readonly challengeController: ChallengeController;
  private readonly authController: AuthController;
  private readonly gameController: GameController;
  private readonly authMiddleware: AuthMiddleware;

  constructor(database: Database, config: Config) {
    this.userRepository = new UserRepository(database);
    this.challengeRepository = new ChallengeRepository(database);
    this.authRepository = new AuthRepository(database);
    this.gameRepository = new GameRepository(database);
    this.permissionRepository = new PermissionRepository(database);

    this.healthService = new HealthService();
    this.userService = new UserService(this.userRepository);
    this.challengeService = new ChallengeService(this.challengeRepository);
    this.permissionService = new PermissionService(this.permissionRepository);
    this.authService = new AuthService(this.authRepository, this.permissionService, config.auth);
    this.gameService = new GameService(this.gameRepository);

    this.authMiddleware = new AuthMiddleware(this.authService);
    this.scalarController = new ScalarController();
    this.healthController = new HealthController(this.healthService);
    this.userController = new UserController(this.userService, this.authMiddleware);
    this.challengeController = new ChallengeController(this.challengeService);
    this.authController = new AuthController(
      this.authService,
      this.userService,
      this.permissionService,
      config.auth
    );
    this.gameController = new GameController(this.gameService);
  }

  setup(group: TypeBoxGroup): void {
    this.scalarController.setup(group.group({ prefix: '/scalar' }));
    this.healthController.setup(group.group({ prefix: '/health' }));
    this.userController.setup(group.group({ prefix: '/user' }));
    this.challengeController.setup(group.group({ prefix: '/challenge' }));
    this.authController.setup(group.group({ prefix: '/auth' }));
    this.gameController.setup(group.group({ prefix: '/game' }));
  }
}
