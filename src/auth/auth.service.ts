import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service.js';
import { CompaniesService } from '../companies/companies.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { User } from '../users/entities/user.entity.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly companiesService: CompaniesService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    let targetCompanyId = registerDto.companyId;

    if (!targetCompanyId && registerDto.companyName && registerDto.companyName.trim()) {
      const cleanName = registerDto.companyName.trim();
      let company = await this.companiesService.findByName(cleanName);
      if (!company) {
        company = await this.companiesService.create({
          name: cleanName,
        });
      }
      targetCompanyId = company.id;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);

    const newUser = await this.usersService.create({
      name: registerDto.name,
      email: registerDto.email,
      password: hashedPassword,
      role: registerDto.role,
      companyId: targetCompanyId,
    });

    const fullUser = await this.usersService.findById(newUser.id);
    const token = this.generateToken(fullUser);

    return {
      message: 'Registration successful',
      accessToken: token,
      user: this.sanitizeUser(fullUser),
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email, true);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Your account is currently disabled');
    }

    const token = this.generateToken(user);

    return {
      message: 'Login successful',
      accessToken: token,
      user: this.sanitizeUser(user),
    };
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId ?? null,
      company: user.company
        ? {
            id: user.company.id,
            name: user.company.name,
            subscriptionPlan: user.company.subscriptionPlan,
            subscriptionStatus: user.company.subscriptionStatus,
            subscriptionExpiresAt: user.company.subscriptionExpiresAt,
            maxAudits: user.company.maxAudits,
          }
        : null,
      createdAt: user.createdAt,
    };
  }
}
