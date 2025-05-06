import type { CreateUser, User } from './data';
import type { UserRepository } from './repository';

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Find all users.
   */
  async all(): Promise<User[]> {
    return await this.userRepository.all();
  }

  /**
   * Find a user by username.
   */
  async byUsername(username: User['username']): Promise<User | undefined> {
    return await this.userRepository.byUsername(username);
  }

  /**
   * Find a user by id.
   */
  async byId(id: User['id']): Promise<User | undefined> {
    return await this.userRepository.byId(id);
  }

  /**
   * Create a new user.
   */
  async create(user: CreateUser): Promise<User> {
    return await this.userRepository.create(user);
  }
}
