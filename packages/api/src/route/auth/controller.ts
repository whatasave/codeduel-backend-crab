import { internalServerError, type RouterGroup } from '@codeduel-backend-crab/server';
import { validated } from '@codeduel-backend-crab/server/validation';
import type { AuthService } from './service';
import { GithubController } from './github/controller';
import { GithubService } from './github/service';
import type { Config } from './config';
import { GitlabService } from './gitlab/service';
import { GitlabController } from './gitlab/controller';

export class AuthController {
  private readonly githubService: GithubService;
  private readonly gitlabService: GitlabService;

  private readonly githubController: GithubController;
  private readonly gitlabController: GitlabController;

  constructor(
    private readonly authService: AuthService,
    private readonly config: Config
  ) {
    this.githubService = new GithubService(this.authService, this.config.github);
    this.gitlabService = new GitlabService(this.authService, this.config.gitlab);

    this.gitlabController = new GitlabController(this.gitlabService);
    this.githubController = new GithubController(this.githubService);
  }

  setup(group: RouterGroup): void {
    group.route(this.validate);
    group.route(this.refresh);
    group.route(this.logout);

    this.githubController.setup(group.group({ prefix: '/github' }));
    this.gitlabController.setup(group.group({ prefix: '/gitlab' }));
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
