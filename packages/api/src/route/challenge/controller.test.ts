import { describe, test, jest, expect, afterEach, spyOn, beforeAll } from 'bun:test';
import { ChallengeService } from './service';
import type {
  ChallengeWithUser,
  ChallengeWithUserAndTestCases,
  CreateChallenge,
  Challenge,
} from './data';
import { ChallengeController } from './controller';
import type { ChallengeRepository } from './repository';
import { Router } from '@glass-cannon/router';
import { typebox } from '@glass-cannon/typebox';
import { jsonToRequestBody, responseBodyToJson } from '../../utils/stream';
import { ReadableStream } from 'node:stream/web';
import { json } from '@glass-cannon/server-bun';

describe('Route.Challenge.Controller', () => {
  let service: ChallengeService;
  let controller: ChallengeController;
  let router: Router;

  const mockChallenge: Challenge = {
    id: 1,
    ownerId: 1,
    title: 'Test Challenge',
    description: 'This is a test challenge',
    content: 'print("Hello, World!")',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockChallengeWithUser: ChallengeWithUser = {
    id: 1,
    owner: {
      id: 1,
      username: 'testuser',
      name: 'Test User',
      avatar: 'avatar.png',
      backgroundImage: 'background.png',
      biography: 'This is a test user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    title: 'Test Challenge',
    description: 'This is a test challenge',
    content: 'print("Hello, World!")',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockChallengeWithUserAndTestCases: ChallengeWithUserAndTestCases = {
    ...mockChallengeWithUser,
    testCases: [{ input: 'input', output: 'output' }],
  };

  beforeAll(async () => {
    service = new ChallengeService({} as ChallengeRepository);
    controller = new ChallengeController(service);
    router = new Router();
    controller.setup(
      typebox(router, { onInvalidRequest: ({ errors }) => json({ status: 400, body: { errors } }) })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    const mockCreateChallenge: CreateChallenge = {
      ownerId: 1,
      title: 'Test Challenge',
      description: 'This is a test challenge',
      content: 'print("Hello, World!")',
    };

    test('should create a challenge', async () => {
      const spyCreate = spyOn(service, 'create').mockResolvedValue(mockChallenge);

      const response = await router.handle({
        method: 'POST',
        url: new URL('http://localhost/'),
        stream: jsonToRequestBody(mockCreateChallenge),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });

      expect(spyCreate).toHaveBeenCalledTimes(1);
      expect(spyCreate).toHaveBeenCalledWith(mockCreateChallenge);
      expect(response.status).toBe(201);
      expect(await responseBodyToJson(response.body)).toEqual(mockChallenge);
    });
  });

  describe('byId', () => {
    test('should get a challenge by id', async () => {
      const spyById = spyOn(service, 'byId').mockResolvedValue(mockChallengeWithUserAndTestCases);

      const response = await router.handle({
        method: 'GET',
        url: new URL('http://localhost/1'),
        stream: new ReadableStream(),
        headers: new Headers(),
      });

      expect(spyById).toHaveBeenCalledTimes(1);
      expect(spyById).toHaveBeenCalledWith(1);
      expect(response.status).toBe(200);
      expect(await responseBodyToJson(response.body)).toEqual(mockChallengeWithUserAndTestCases);
    });

    test('should return 404 if challenge not found', async () => {
      const spyById = spyOn(service, 'byId').mockResolvedValue(undefined);

      const response = await router.handle({
        method: 'GET',
        url: new URL('http://localhost/1'),
        stream: new ReadableStream(),
        headers: new Headers(),
      });

      expect(spyById).toHaveBeenCalledTimes(1);
      expect(spyById).toHaveBeenCalledWith(1);
      expect(response.status).toBe(404);
    });
  });

  describe('all', () => {
    test('should get all challenges', async () => {
      const spyAll = spyOn(service, 'all').mockResolvedValue([mockChallengeWithUser]);

      const response = await router.handle({
        method: 'GET',
        url: new URL('http://localhost/'),
        stream: new ReadableStream(),
        headers: new Headers(),
      });

      expect(spyAll).toHaveBeenCalledTimes(1);
      expect(spyAll).toHaveBeenCalledWith();
      expect(response.status).toEqual(200);
      expect(await responseBodyToJson(response.body)).toEqual([mockChallengeWithUser]);
    });
  });

  describe('update', () => {
    test('should update a challenge', async () => {
      const spyUpdate = spyOn(service, 'update').mockResolvedValue(mockChallenge);

      const updatedChallenge = {
        id: 1,
        title: 'Updated Title',
        description: 'This is an updated test challenge',
        content: 'print("Hello, Updated World!")',
      };

      const response = await router.handle({
        method: 'PUT',
        url: new URL('http://localhost/'),
        stream: jsonToRequestBody(updatedChallenge),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });

      expect(spyUpdate).toHaveBeenCalledTimes(1);
      expect(spyUpdate).toHaveBeenCalledWith(updatedChallenge);
      expect(response.status).toEqual(200);
      expect(await responseBodyToJson(response.body)).toEqual(mockChallenge);
    });

    test('should return 404 on update not found', async () => {
      const spyUpdate = spyOn(service, 'update').mockResolvedValue(undefined);

      const updatedChallenge = {
        id: 999,
        title: 'Updated Title',
        description: 'This is an updated test challenge',
        content: 'print("Hello, Updated World!")',
      };

      const response = await router.handle({
        method: 'PUT',
        url: new URL('http://localhost/'),
        stream: jsonToRequestBody(updatedChallenge),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });

      expect(spyUpdate).toHaveBeenCalledTimes(1);
      expect(spyUpdate).toHaveBeenCalledWith(updatedChallenge);
      expect(response.status).toBe(404);
    });
  });

  describe('delete', () => {
    test('should delete a challenge', async () => {
      const spyDelete = spyOn(service, 'delete').mockResolvedValue(true);

      const response = await router.handle({
        method: 'DELETE',
        url: new URL('http://localhost/1'),
        stream: new ReadableStream(),
        headers: new Headers(),
      });

      expect(spyDelete).toHaveBeenCalledTimes(1);
      expect(spyDelete).toHaveBeenCalledWith(1);
      expect(response.status).toBe(204);
    });
  });

  describe('random', () => {
    test('should get a random challenge', async () => {
      const spyRandom = spyOn(service, 'random').mockResolvedValue(
        mockChallengeWithUserAndTestCases
      );

      const response = await router.handle({
        method: 'GET',
        url: new URL('http://localhost/random'),
        stream: new ReadableStream(),
        headers: new Headers(),
      });

      expect(spyRandom).toHaveBeenCalledTimes(1);
      expect(spyRandom).toHaveBeenCalledWith();
      expect(response.status).toBe(200);
      expect(await responseBodyToJson(response.body)).toEqual(mockChallengeWithUserAndTestCases);
    });

    test('should return undefined if no challenges exist', async () => {
      const spyRandom = spyOn(service, 'random').mockResolvedValue(undefined);

      const response = await router.handle({
        method: 'GET',
        url: new URL('http://localhost/random'),
        stream: new ReadableStream(),
        headers: new Headers(),
      });

      expect(spyRandom).toHaveBeenCalledTimes(1);
      expect(spyRandom).toHaveBeenCalledWith();
      expect(response.status).toBe(404);
    });
  });
});
