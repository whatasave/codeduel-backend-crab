import { Type, type Static } from '@sinclair/typebox';
import { User } from '../user/data';

export type TestCase = Static<typeof TestCase>;
export const TestCase = Type.Object({
  input: Type.String(),
  output: Type.String(),
});

export type Challenge = Static<typeof Challenge>;
export const Challenge = Type.Object({
  id: Type.Integer(),
  ownerId: Type.Number(),
  title: Type.String(),
  description: Type.String(),
  content: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

export type ChallengeWithUser = Static<typeof ChallengeWithUser>;
export const ChallengeWithUser = Type.Object({
  id: Type.Integer(),
  owner: User,
  title: Type.String(),
  description: Type.String(),
  content: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

export type ChallengeWithUserAndTestCases = Static<typeof ChallengeWithUserAndTestCases>;
export const ChallengeWithUserAndTestCases = Type.Object({
  id: Type.Integer(),
  owner: User,
  title: Type.String(),
  description: Type.String(),
  content: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
  testCases: Type.Array(TestCase),
});

export type CreateChallenge = Static<typeof CreateChallenge>;
export const CreateChallenge = Type.Object({
  ownerId: Type.Integer(),
  title: Type.String(),
  description: Type.String(),
  content: Type.String(),
});

export type UpdateChallenge = Static<typeof UpdateChallenge>;
export const UpdateChallenge = Type.Object({
  id: Type.Integer(),
  title: Type.String(),
  description: Type.String(),
  content: Type.String(),
});
