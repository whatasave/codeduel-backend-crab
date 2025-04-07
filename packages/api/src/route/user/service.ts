import type { CreateUser, User } from './data';
import type { UserRepository } from './repository';

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  public async findAll(): Promise<User[]> {
    return await this.userRepository.findAll();
  }

  public async findByUsername(username: User['username']): Promise<User | undefined> {
    return await this.userRepository.findByUsername(username);
  }

  public async findById(id: User['id']): Promise<User | undefined> {
    return await this.userRepository.findById(id);
  }

  public async create(user: CreateUser): Promise<User | undefined> {
    return await this.userRepository.create(user);
  }
}
