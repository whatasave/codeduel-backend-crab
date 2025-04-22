import { internalServerError, type RouterGroup } from '@codeduel-backend-crab/server';
import { validated } from '@codeduel-backend-crab/server/validation';
import type { AuthService } from './service';
import { GithubController } from './github/controller';
import { GithubService } from './github/service';
import type { UserService } from '../user/service';
import type { Config } from './config';

export class AuthController {
  private readonly githubService: GithubService;
  private readonly githubController: GithubController;

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly config: Config
  ) {
    this.githubService = new GithubService(this.authService, this.userService, this.config.github);
    this.githubController = new GithubController(this.githubService, this.authService);
  }

  setup(group: RouterGroup): void {
    group.route(this.validate);
    group.route(this.refresh);
    group.route(this.logout);

    this.githubController.setup(group.group({ prefix: '/github' }));
  }

  validate = validated({
    method: 'GET',
    path: '/validate',
    schema: {
      request: {},
      response: {},
    },
    handler: async () => {
      return internalServerError({ error: 'Path not implemented' });
    },
  });

  refresh = validated({
    method: 'GET',
    path: '/refresh',
    schema: {
      request: {},
      response: {},
    },
    handler: async () => {
      return internalServerError({ error: 'Path not implemented' });
    },
  });

  logout = validated({
    method: 'GET',
    path: '/logout',
    schema: {
      request: {},
      response: {},
    },
    handler: async () => {
      return internalServerError({ error: 'Path not implemented' });
    },
  });
}
