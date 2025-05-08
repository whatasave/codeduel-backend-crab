import { internalServerError, type RouterGroup } from '@codeduel-backend-crab/server';
import { validated } from '@codeduel-backend-crab/server/validation';
import type { AuthService, AuthServiceConfig } from './service';
import { GithubController } from './github/controller';
import { GitlabController } from './gitlab/controller';
import { GithubService } from './github/service';
import { GitlabService } from './gitlab/service';

export class AuthController {
  private readonly githubController: GithubController;
  private readonly gitlabController: GitlabController;

  constructor(
    private readonly service: AuthService,
    config: AuthServiceConfig
  ) {
    this.githubController = new GithubController(
      new GithubService(this.service, config.github),
      this.service
    );
    this.gitlabController = new GitlabController(
      new GitlabService(this.service, config.gitlab),
      this.service
    );
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
