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
}
