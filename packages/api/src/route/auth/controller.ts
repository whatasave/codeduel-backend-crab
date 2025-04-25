import { internalServerError, type RouterGroup } from '@codeduel-backend-crab/server';
import { validated } from '@codeduel-backend-crab/server/validation';
import type { AuthService } from './service';
import type { GithubController } from './github/controller';
import type { GitlabController } from './gitlab/controller';

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly githubController: GithubController,
    private readonly gitlabController: GitlabController
  ) {}

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
