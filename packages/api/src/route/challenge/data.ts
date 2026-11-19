import { Type, type Static } from '@sinclair/typebox';
import { User, UserListItem } from '../user/data';

export type TestCase = Static<typeof TestCase>;
export const TestCase = Type.Object({
  input: Type.String(),
  output: Type.String(),
});

export type Challenge = Static<typeof Challenge>;
export const Challenge = Type.Object({
  id: Type.Integer(),
  ownerId: User.properties.id,
  title: Type.String(),
  description: Type.String(),
  content: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

/** Challenge as listed by the API: the test cases are only counted. */
export type ChallengeSummary = Static<typeof ChallengeSummary>;
export const ChallengeSummary = Type.Object({
  id: Challenge.properties.id,
  owner: UserListItem,
  title: Challenge.properties.title,
  description: Challenge.properties.description,
  content: Challenge.properties.content,
  testCases: Type.Integer({ minimum: 0 }),
  createdAt: Challenge.properties.createdAt,
});

/** Challenge with its test cases, split into visible and hidden ones. */
export type ChallengeDetailed = Static<typeof ChallengeDetailed>;
export const ChallengeDetailed = Type.Object({
  id: Challenge.properties.id,
  owner: UserListItem,
  title: Challenge.properties.title,
  description: Challenge.properties.description,
  content: Challenge.properties.content,
  testCases: Type.Array(TestCase),
  hiddenTestCases: Type.Array(TestCase),
  createdAt: Challenge.properties.createdAt,
});

export type ChallengeBody = Static<typeof ChallengeBody>;
export const ChallengeBody = Type.Object({
  title: Challenge.properties.title,
  description: Challenge.properties.description,
  content: Challenge.properties.content,
});

export type CreateChallenge = Static<typeof CreateChallenge>;
export const CreateChallenge = Type.Object({
  ownerId: Challenge.properties.ownerId,
  ...ChallengeBody.properties,
});

export type UpdateChallenge = Static<typeof UpdateChallenge>;
export const UpdateChallenge = Type.Object({
  id: Challenge.properties.id,
  ...ChallengeBody.properties,
});
