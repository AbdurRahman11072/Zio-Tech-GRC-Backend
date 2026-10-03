import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditProject,
  AuditStatus,
} from './entities/audit-project.entity.js';
import { CreateAuditProjectDto } from './dto/create-audit-project.dto.js';
import { UpdateAuditProjectDto } from './dto/update-audit-project.dto.js';
import { UserRole } from '../users/entities/user.entity.js';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  companyId?: string | null;
}

@Injectable()
export class AuditsService {
  constructor(
    @InjectRepository(AuditProject)
    private readonly auditRepository: Repository<AuditProject>,
  ) {}

  async create(
    createDto: CreateAuditProjectDto,
    currentUser?: AuthenticatedUser,
  ): Promise<AuditProject> {
    const code =
      createDto.code ||
      `AUD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const existingCode = await this.auditRepository.findOne({
      where: { code },
    });
    if (existingCode) {
      throw new ConflictException(`Audit code "${code}" is already in use`);
    }

    const leadAuditorId =
      createDto.leadAuditorId ||
      (currentUser?.role === UserRole.AUDITOR ? currentUser.id : null);

    const audit = this.auditRepository.create({
      ...createDto,
      code,
      leadAuditorId,
      status: createDto.status || AuditStatus.DRAFT,
      startDate: createDto.startDate ? new Date(createDto.startDate) : null,
      targetDate: createDto.targetDate ? new Date(createDto.targetDate) : null,
    });

    const saved = await this.auditRepository.save(audit);
    return await this.findById(saved.id, currentUser);
  }

  async findAll(currentUser?: AuthenticatedUser): Promise<AuditProject[]> {
    // Multi-tenant scoping: Client members can only see audits of their own company
    if (
      currentUser &&
      (currentUser.role === UserRole.COMPANY_USER ||
        currentUser.role === UserRole.AUDITEE)
    ) {
      if (!currentUser.companyId) {
        return [];
      }
      return await this.auditRepository.find({
        where: { companyId: currentUser.companyId },
        relations: { company: true, leadAuditor: true },
        order: { createdAt: 'DESC' },
      });
    }

    // Admins and auditors can view all audit projects
    return await this.auditRepository.find({
      relations: { company: true, leadAuditor: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(
    id: string,
    currentUser?: AuthenticatedUser,
  ): Promise<AuditProject> {
    const audit = await this.auditRepository.findOne({
      where: { id },
      relations: { company: true, leadAuditor: true },
    });

    if (!audit) {
      throw new NotFoundException(`Audit project with ID "${id}" not found`);
    }

    if (
      currentUser &&
      (currentUser.role === UserRole.COMPANY_USER ||
        currentUser.role === UserRole.AUDITEE)
    ) {
      if (audit.companyId !== currentUser.companyId) {
        throw new ForbiddenException(
          'Access denied: You can only view audit projects belonging to your company',
        );
      }
    }

    return audit;
  }

  async update(
    id: string,
    updateDto: UpdateAuditProjectDto,
    currentUser?: AuthenticatedUser,
  ): Promise<AuditProject> {
    const audit = await this.findById(id, currentUser);

    if (updateDto.code && updateDto.code !== audit.code) {
      const duplicate = await this.auditRepository.findOne({
        where: { code: updateDto.code },
      });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(
          `Audit code "${updateDto.code}" is already in use`,
        );
      }
    }

    Object.assign(audit, {
      ...updateDto,
      startDate: updateDto.startDate
        ? new Date(updateDto.startDate)
        : audit.startDate,
      targetDate: updateDto.targetDate
        ? new Date(updateDto.targetDate)
        : audit.targetDate,
    });

    await this.auditRepository.save(audit);
    return await this.findById(id, currentUser);
  }

  async remove(
    id: string,
    currentUser?: AuthenticatedUser,
  ): Promise<{ message: string }> {
    const audit = await this.findById(id, currentUser);
    await this.auditRepository.remove(audit);
    return {
      message: `Audit project "${audit.title}" (${audit.code}) removed successfully`,
    };
  }
}
