import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    const existing = await this.companyRepository.findOne({
      where: { name: createCompanyDto.name },
    });
    if (existing) {
      throw new ConflictException(
        `A company with the name "${createCompanyDto.name}" already exists`,
      );
    }

    const company = this.companyRepository.create(createCompanyDto);
    return await this.companyRepository.save(company);
  }

  async findAll(): Promise<Company[]> {
    return await this.companyRepository.find({
      relations: { users: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: { users: true },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID "${id}" not found`);
    }
    return company;
  }

  async update(
    id: string,
    updateCompanyDto: UpdateCompanyDto,
  ): Promise<Company> {
    const company = await this.findById(id);

    if (
      updateCompanyDto.name &&
      updateCompanyDto.name.toLowerCase() !== company.name.toLowerCase()
    ) {
      const duplicate = await this.companyRepository.findOne({
        where: { name: updateCompanyDto.name },
      });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(
          `A company with the name "${updateCompanyDto.name}" already exists`,
        );
      }
    }

    Object.assign(company, updateCompanyDto);
    return await this.companyRepository.save(company);
  }

  async remove(id: string): Promise<{ message: string }> {
    const company = await this.findById(id);
    await this.companyRepository.remove(company);
    return { message: `Company "${company.name}" removed successfully` };
  }

  async findByName(name: string): Promise<Company | null> {
    return await this.companyRepository.findOne({
      where: { name },
      relations: { users: true },
    });
  }

  async updateSubscription(
    id: string,
    dto: import('./dto/update-subscription.dto.js').UpdateSubscriptionDto,
  ): Promise<Company> {
    const company = await this.findById(id);
    company.subscriptionPlan = dto.plan;
    company.subscriptionStatus = dto.status;

    if (dto.maxAudits !== undefined) {
      company.maxAudits = dto.maxAudits;
    } else {
      const { SubscriptionPlan } = await import('./entities/company.entity.js');
      if (dto.plan === SubscriptionPlan.STARTER) company.maxAudits = 3;
      else if (dto.plan === SubscriptionPlan.PROFESSIONAL) company.maxAudits = 10;
      else if (dto.plan === SubscriptionPlan.ENTERPRISE) company.maxAudits = 999;
      else if (dto.plan === SubscriptionPlan.NONE) company.maxAudits = 0;
    }

    if (dto.expiresAt) {
      company.subscriptionExpiresAt = new Date(dto.expiresAt);
    } else {
      const { SubscriptionStatus } = await import('./entities/company.entity.js');
      if (dto.status === SubscriptionStatus.ACTIVE) {
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        company.subscriptionExpiresAt = nextYear;
      }
    }

    return await this.companyRepository.save(company);
  }

  async hasActiveSubscription(companyId: string): Promise<boolean> {
    const company = await this.findById(companyId);
    const { SubscriptionStatus } = await import('./entities/company.entity.js');
    return (
      company.subscriptionStatus === SubscriptionStatus.ACTIVE ||
      company.subscriptionStatus === SubscriptionStatus.TRIAL
    );
  }
}

