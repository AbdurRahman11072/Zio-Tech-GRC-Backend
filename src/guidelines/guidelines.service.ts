import {
  Injectable,
  NotFoundException,
  ConflictException,
  OnApplicationBootstrap,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GuidelineCategory } from './entities/guideline-category.entity.js';
import { CreateGuidelineCategoryDto } from './dto/create-guideline-category.dto.js';
import { UpdateGuidelineCategoryDto } from './dto/update-guideline-category.dto.js';

@Injectable()
export class GuidelinesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(GuidelinesService.name);

  constructor(
    @InjectRepository(GuidelineCategory)
    private readonly categoryRepository: Repository<GuidelineCategory>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedDefaultCategories();
  }

  async seedDefaultCategories(): Promise<void> {
    const count = await this.categoryRepository.count();
    if (count > 0) return;

    const defaults = [
      {
        name: 'Information Security',
        code: 'INFO_SEC',
        description: 'ISO/IEC 27001 standard controls, information asset protection, and technical safeguards',
        icon: 'ShieldCheck',
        sortOrder: 1,
      },
      {
        name: 'Data Privacy & Protection',
        code: 'DATA_PRIVACY',
        description: 'GDPR, CCPA, consumer rights, and customer data retention policies',
        icon: 'Lock',
        sortOrder: 2,
      },
      {
        name: 'Trust Services Criteria',
        code: 'SOC_2',
        description: 'SOC 2 Type II Security, Availability, Processing Integrity, and Confidentiality controls',
        icon: 'CheckCircle2',
        sortOrder: 3,
      },
      {
        name: 'Cloud Governance & Infrastructure',
        code: 'CLOUD_GOV',
        description: 'Cloud security architecture, multi-tenant isolation, and AWS/Azure/GCP controls',
        icon: 'Cloud',
        sortOrder: 4,
      },
      {
        name: 'Healthcare Compliance',
        code: 'HIPAA',
        description: 'HIPAA Security and Privacy Rule requirements for protected health information (PHI)',
        icon: 'Activity',
        sortOrder: 5,
      },
      {
        name: 'Financial & Payment Security',
        code: 'PCI_DSS',
        description: 'PCI-DSS cardholder data environment security and encryption guidelines',
        icon: 'CreditCard',
        sortOrder: 6,
      },
    ];

    for (const item of defaults) {
      const cat = this.categoryRepository.create({
        ...item,
        isActive: true,
      });
      await this.categoryRepository.save(cat);
    }

    this.logger.log(`Seeded ${defaults.length} default dynamic guideline categories.`);
  }

  async findAll(onlyActive = true): Promise<GuidelineCategory[]> {
    const where = onlyActive ? { isActive: true } : {};
    return await this.categoryRepository.find({
      where,
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async findById(id: string): Promise<GuidelineCategory> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Guideline category with ID "${id}" not found`);
    }
    return category;
  }

  async create(
    dto: CreateGuidelineCategoryDto,
    adminId?: string,
  ): Promise<GuidelineCategory> {
    const code =
      dto.code ||
      dto.name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
        .replace(/__+/g, '_');

    const existingName = await this.categoryRepository.findOne({
      where: { name: dto.name },
    });
    if (existingName) {
      throw new ConflictException(
        `A guideline category named "${dto.name}" already exists`,
      );
    }

    const existingCode = await this.categoryRepository.findOne({
      where: { code },
    });
    if (existingCode) {
      throw new ConflictException(
        `A guideline category with code "${code}" already exists`,
      );
    }

    const category = this.categoryRepository.create({
      ...dto,
      code,
      createdByAdminId: adminId || null,
      icon: dto.icon || 'ShieldCheck',
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : 0,
    });

    return await this.categoryRepository.save(category);
  }

  async update(
    id: string,
    dto: UpdateGuidelineCategoryDto,
  ): Promise<GuidelineCategory> {
    const category = await this.findById(id);

    if (dto.name && dto.name.toLowerCase() !== category.name.toLowerCase()) {
      const duplicate = await this.categoryRepository.findOne({
        where: { name: dto.name },
      });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(
          `A guideline category named "${dto.name}" already exists`,
        );
      }
    }

    if (dto.code && dto.code !== category.code) {
      const duplicate = await this.categoryRepository.findOne({
        where: { code: dto.code },
      });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(
          `A guideline category with code "${dto.code}" already exists`,
        );
      }
    }

    Object.assign(category, dto);
    return await this.categoryRepository.save(category);
  }

  async remove(id: string): Promise<{ message: string }> {
    const category = await this.findById(id);
    await this.categoryRepository.remove(category);
    return {
      message: `Guideline category "${category.name}" removed successfully`,
    };
  }
}
