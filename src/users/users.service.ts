import {
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import bcrypt from 'bcryptjs';
import { User, UserRole } from './entities/user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedAdmin();
  }

  async seedAdmin(): Promise<User> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@ziotech.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
    const existingAdmin = await this.findByEmail(adminEmail, true);

    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      const admin = this.userRepository.create({
        name: 'System Administrator',
        email: adminEmail,
        password: hashedPassword,
        role: UserRole.ADMIN,
        isActive: true,
      });
      const saved = await this.userRepository.save(admin);
      this.logger.log(`Default Administrator seeded: ${adminEmail} (Role: ${saved.role})`);
      return saved;
    } else {
      let updated = false;
      if (existingAdmin.role !== UserRole.ADMIN) {
        existingAdmin.role = UserRole.ADMIN;
        updated = true;
      }
      if (!existingAdmin.isActive) {
        existingAdmin.isActive = true;
        updated = true;
      }
      if (updated) {
        await this.userRepository.save(existingAdmin);
      }
      this.logger.log(`Verified Administrator account active: ${adminEmail}`);
      return existingAdmin;
    }
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    let hashedPassword = createUserDto.password;
    if (
      !createUserDto.password.startsWith('$2b$') &&
      !createUserDto.password.startsWith('$2a$')
    ) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(createUserDto.password, salt);
    }

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
    return await this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find();
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }

  async findByEmail(email: string, includePassword = false): Promise<User | null> {
    if (includePassword) {
      return await this.userRepository
        .createQueryBuilder('user')
        .addSelect('user.password')
        .where('user.email = :email', { email })
        .getOne();
    }
    return await this.userRepository.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (
      updateUserDto.password &&
      !updateUserDto.password.startsWith('$2b$') &&
      !updateUserDto.password.startsWith('$2a$')
    ) {
      const salt = await bcrypt.genSalt(10);
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, salt);
    }
    Object.assign(user, updateUserDto);
    return await this.userRepository.save(user);
  }

  async remove(id: string): Promise<{ message: string }> {
    const user = await this.findById(id);
    await this.userRepository.remove(user);
    return { message: `User with ID "${id}" removed successfully` };
  }
}

