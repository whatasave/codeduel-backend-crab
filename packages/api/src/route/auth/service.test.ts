// import { afterEach, beforeAll, describe, expect, spyOn, test, jest } from 'bun:test';
// import type { Database } from '@codeduel-backend-crab/database';
// import { AuthRepository } from './repository';
// import { AuthService } from './service';
// import type { Config } from './config';
// import type { CreateUser, User } from '../user/data';
// import type { Auth, Provider } from './data';

// describe('Route.Auth.Service', () => {
//   let db: Database;
//   let repository: AuthRepository;
//   let service: AuthService;

//   const config = {} as Config;

//   beforeAll(() => {
//     db = {} as Database;
//     repository = new AuthRepository(db);
//     service = new AuthService(repository, config);
//   });

//   afterEach(() => {
//     jest.restoreAllMocks();
//   });

//   test('should return all the users', async () => {
//     const mockCreateUser: CreateUser = {
//       username: 'username',
//       name: 'name',
//       avatar: 'pic.io/avatar.png',
//       backgroundImage: 'pic.io/background.png',
//       biography: 'biography',
//     };
//     const mockProvider: Provider = {
//       userId: 0,
//       name: 'provider-x',
//     };
//     const mockDate = new Date('2025-05-12T18:39:26.183Z').toString();
//     const mockUser: User = {
//       ...mockCreateUser,
//       id: 1,
//       createdAt: mockDate,
//       updatedAt: mockDate,
//     };
//     const mockAuth: Auth = {
//       userId: mockUser.id,
//       provider: mockProvider.name,
//       providerId: mockProvider.userId,
//       createdAt: mockDate,
//       updatedAt: mockDate,
//     };
//     const spyCreateIfNotExists = spyOn(repository, 'createIfNotExists').mockResolvedValue([
//       mockAuth,
//       mockUser,
//     ]);
//     const [auth, user] = await service.createIfNotExists(mockProvider, mockCreateUser);

//     expect(spyCreateIfNotExists).toHaveBeenCalledWith();
//     expect(spyCreateIfNotExists).toHaveBeenCalledTimes(1);
//     expect(auth).toEqual(mockAuth);
//     expect(user).toEqual(mockUser);
//   });
// });
