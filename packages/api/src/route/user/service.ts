import type { CreateUser, User } from './data';
import type { UserRepository } from './repository';

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Find all users.
   */
  async findAll(): Promise<User[]> {
    return await this.userRepository.findAll();
  }

  /**
   * Find a user by username.
   */
  async findByUsername(username: User['username']): Promise<User | undefined> {
    return await this.userRepository.findByUsername(username);
  }

  /**
   * Find a user by id.
   */
  async findById(id: User['id']): Promise<User | undefined> {
    return await this.userRepository.findById(id);
  }

  /**
   * Create a new user.
   */
  async create(user: CreateUser): Promise<User> {
    return await this.userRepository.create(user);
  }
}
