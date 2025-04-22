import { Type, type Static } from '@sinclair/typebox';

export type GithubUserData = Static<typeof GithubUserData>;
export const GithubUserData = Type.Object({
  login: Type.String(),
  id: Type.Number(),
  node_id: Type.String(),
  avatar_url: Type.Optional(Type.String()),
  gravatar_id: Type.String(),
  url: Type.String(),
  html_url: Type.String(),
  followers_url: Type.String(),
  following_url: Type.String(),
  gists_url: Type.String(),
  starred_url: Type.String(),
  subscriptions_url: Type.String(),
  organizations_url: Type.String(),
  repos_url: Type.String(),
  events_url: Type.String(),
  receivedEvents_url: Type.String(),
  type: Type.String(),
  site_admin: Type.Boolean(),
  name: Type.Optional(Type.String()),
  company: Type.String(),
  blog: Type.String(),
  location: Type.String(),
  email: Type.String(),
  hireable: Type.Boolean(),
  bio: Type.Optional(Type.String()),
  twitter_username: Type.String(),
  public_repos: Type.Number(),
  public_gists: Type.Number(),
  followers: Type.Number(),
  following: Type.Number(),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' }),
});

export type GithubEmail = Static<typeof GithubEmail>;
export const GithubEmail = Type.Object({
  email: Type.String(),
  verified: Type.Boolean(),
  primary: Type.Boolean(),
  visibility: Type.String(),
});

export type GithubAccessToken = Static<typeof GithubAccessToken>;
export const GithubAccessToken = Type.Object({
  access_token: Type.String(),
  token_type: Type.String(),
  scope: Type.String(),
});
