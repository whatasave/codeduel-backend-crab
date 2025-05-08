import { internalServerError, type RouterGroup } from '@codeduel-backend-crab/server';
import { validated } from '@codeduel-backend-crab/server/validation';
import type { AuthService } from './service';
import { GithubController, GithubControllerConfig } from './github/controller';
import { GitlabController, GitlabControllerConfig } from './gitlab/controller';
import { Type, type Static } from '@sinclair/typebox';
import { GithubService, GithubServiceConfig } from './github/service';
import { GitlabService, GitlabServiceConfig } from './gitlab/service';

export type AuthControllerConfig = Static<typeof AuthControllerConfig>;
export const AuthControllerConfig = Type.Object({
  github: Type.Object({
    service: GithubServiceConfig,
    controller: GithubControllerConfig,
  }),
  gitlab: Type.Object({
    service: GitlabServiceConfig,
    controller: GitlabControllerConfig,
  }),
});

export class AuthController {
  private readonly githubController: GithubController;
  private readonly gitlabController: GitlabController;

  constructor(
    private readonly authService: AuthService,
    config: AuthControllerConfig
  ) {
    this.githubController = new GithubController(
      new GithubService(authService, config.github.service),
      config.github.controller
    );
    this.gitlabController = new GitlabController(
      new GitlabService(authService, config.gitlab.service),
      config.gitlab.controller
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
