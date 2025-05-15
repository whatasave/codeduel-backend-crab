// import { afterEach, beforeAll, describe, jest, test } from 'bun:test';
// import type { Database } from '@codeduel-backend-crab/database';
// import { setupTestDatabase } from '../../utils/test';
// import { AuthRepository } from './repository';

// describe('Route.Auth.Repository', () => {
//   let db: Database;
//   let repository: AuthRepository;

//   beforeAll(async () => {
//     db = await setupTestDatabase();
//     repository = new AuthRepository(db);

//     // await db.transaction().execute(async (trx) => {
//     //   await trx
//     //     .insertInto('user')
//     //     .values(
//     //       mockUsers.map((user) => ({
//     //         username: user.username,
//     //         name: user.name,
//     //         avatar: user.avatar,
//     //         background_image: user.backgroundImage,
//     //         biography: user.biography,
//     //       }))
//     //     )
//     //     .returningAll()
//     //     .executeTakeFirstOrThrow();
//     // });
//   });

//   afterEach(() => {
//     jest.clearAllMocks();
//   });

//   test('should throw error if username already exists', async () => {
//     // expect(repository.create(user)).rejects.toThrowError();
//   });
// });
