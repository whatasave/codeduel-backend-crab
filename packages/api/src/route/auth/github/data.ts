import { Type, type Static } from '@sinclair/typebox';

export type GithubUserData = Static<typeof GithubUserData>;
export const GithubUserData = Type.Object({
  login: Type.String(),
  id: Type.Number(),
  nodeId: Type.String(),
  avatarUrl: Type.Optional(Type.String()),
  gravatarId: Type.String(),
  url: Type.String(),
  htmlUrl: Type.String(),
  followersUrl: Type.String(),
  followingUrl: Type.String(),
  gistsUrl: Type.String(),
  starredUrl: Type.String(),
  subscriptionsUrl: Type.String(),
  organizationsUrl: Type.String(),
  reposUrl: Type.String(),
  eventsUrl: Type.String(),
  receivedEventsUrl: Type.String(),
  type: Type.String(),
  siteAdmin: Type.Boolean(),
  name: Type.Optional(Type.String()),
  company: Type.String(),
  blog: Type.String(),
  location: Type.String(),
  email: Type.String(),
  hireable: Type.Boolean(),
  bio: Type.Optional(Type.String()),
  twitterUsername: Type.String(),
  publicRepos: Type.Number(),
  publicGists: Type.Number(),
  followers: Type.Number(),
  following: Type.Number(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
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
  accessToken: Type.String(),
  tokenType: Type.String(),
  scope: Type.String(),
});
