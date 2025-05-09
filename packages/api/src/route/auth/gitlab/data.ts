import { Type, type Static } from '@sinclair/typebox';

export type GitlabUserData = Static<typeof GitlabUserData>;
export const GitlabUserData = Type.Object({
  id: Type.Number(),
  username: Type.String(),
  name: Type.Optional(Type.String()),
  state: Type.String(),
  locked: Type.Boolean(),
  avatar_url: Type.String(),
  web_url: Type.String(),
  created_at: Type.String(),
  bio: Type.String(),
  location: Type.String(),
  public_email: Type.String(),
  skype: Type.String(),
  linkedin: Type.String(),
  twitter: Type.String(),
  discord: Type.String(),
  website_url: Type.String(),
  organization: Type.String(),
  job_title: Type.String(),
  pronouns: Type.String(),
  bot: Type.Boolean(),
  work_information: Type.String({ default: 'null' }),
  local_time: Type.String({ default: 'null' }),
  last_sign_in_at: Type.String(),
  confirmed_at: Type.String(),
  last_activity_on: Type.String(),
  email: Type.String(),
  theme_id: Type.Number(),
  color_scheme_id: Type.Number(),
  projects_limit: Type.Number(),
  current_sign_in_at: Type.String(),
  identities: Type.Array(
    Type.Object({
      provider: Type.String(),
      extern_uid: Type.String(),
      saml_provider_id: Type.String({ default: 'null' }),
    })
  ),
  can_create_group: Type.Boolean(),
  can_create_project: Type.Boolean(),
  two_factor_enabled: Type.Boolean(),
  external: Type.Boolean(),
  private_profile: Type.Boolean(),
  commit_email: Type.String(),
  shared_runners_minutes_limit: Type.String({ default: 'null' }),
  extra_shared_runners_minutes_limit: Type.String({ default: 'null' }),
  scim_identities: Type.Unknown(),
});

export type GitlabEmail = Static<typeof GitlabEmail>;
export const GitlabEmail = Type.Object({
  email: Type.String(),
  verified: Type.Boolean(),
  primary: Type.Boolean(),
  visibility: Type.String(),
});

export type GitlabAccessToken = Static<typeof GitlabAccessToken>;
export const GitlabAccessToken = Type.Object({
  access_token: Type.String(),
  token_type: Type.String(),
  expires_in: Type.Number(),
  refresh_token: Type.String(),
  created_at: Type.Number(),
});
