import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditProject,
  AuditStatus,
} from './entities/audit-project.entity.js';
import {
  AuditMember,
  AuditMemberRole,
} from './entities/audit-member.entity.js';
import { CreateAuditProjectDto } from './dto/create-audit-project.dto.js';
import { UpdateAuditProjectDto } from './dto/update-audit-project.dto.js';
import { AddAuditMemberDto } from './dto/add-audit-member.dto.js';
import { UserRole } from '../users/entities/user.entity.js';
import { CompaniesService } from '../companies/companies.service.js';
import { SubscriptionStatus } from '../companies/entities/company.entity.js';

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
    @InjectRepository(AuditMember)
    private readonly memberRepository: Repository<AuditMember>,
    private readonly companiesService: CompaniesService,
  ) {}

  async create(
    createDto: CreateAuditProjectDto,
    currentUser?: AuthenticatedUser,
  ): Promise<AuditProject> {
    const targetCompanyId = createDto.companyId || currentUser?.companyId;
    if (!targetCompanyId) {
      throw new BadRequestException('A valid company must be specified to create an audit project');
    }

    const company = await this.companiesService.findById(targetCompanyId);
    if (
      company.subscriptionStatus !== SubscriptionStatus.ACTIVE &&
      company.subscriptionStatus !== SubscriptionStatus.TRIAL
    ) {
      throw new ForbiddenException(
        'An active subscription plan is required to create an audit project. Please purchase or activate a subscription plan for your organization.',
      );
    }

    if (company.maxAudits > 0) {
      const activeCount = await this.auditRepository.count({
        where: { companyId: company.id },
      });
      if (activeCount >= company.maxAudits) {
        throw new ForbiddenException(
          `Your organization's subscription plan allows a maximum of ${company.maxAudits} audit projects. Please upgrade your plan to create more audits.`,
        );
      }
    }

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
      companyId: targetCompanyId,
      code,
      leadAuditorId,
      guidelineCategoryId: createDto.guidelineCategoryId || null,
      status: createDto.status || AuditStatus.DRAFT,
      startDate: createDto.startDate ? new Date(createDto.startDate) : null,
      targetDate: createDto.targetDate ? new Date(createDto.targetDate) : null,
    });

    const saved = await this.auditRepository.save(audit);

    // Save lead auditor as audit member
    if (leadAuditorId) {
      const leadMember = this.memberRepository.create({
        auditProjectId: saved.id,
        userId: leadAuditorId,
        roleInAudit: AuditMemberRole.LEAD_AUDITOR,
      });
      await this.memberRepository.save(leadMember);
    }

    // Save auditee members
    if (createDto.auditeeIds && Array.isArray(createDto.auditeeIds)) {
      for (const auditeeId of createDto.auditeeIds) {
        if (auditeeId && auditeeId !== leadAuditorId) {
          const auditeeMember = this.memberRepository.create({
            auditProjectId: saved.id,
            userId: auditeeId,
            roleInAudit: AuditMemberRole.AUDITEE_REVIEWER,
          });
          await this.memberRepository.save(auditeeMember);
        }
      }
    }

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
        relations: {
          company: true,
          leadAuditor: true,
          guidelineCategory: true,
          members: { user: true },
        },
        order: { createdAt: 'DESC' },
      });
    }

    // Admins and auditors can view all audit projects
    return await this.auditRepository.find({
      relations: {
        company: true,
        leadAuditor: true,
        guidelineCategory: true,
        members: { user: true },
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(
    id: string,
    currentUser?: AuthenticatedUser,
  ): Promise<AuditProject> {
    const audit = await this.auditRepository.findOne({
      where: { id },
      relations: {
        company: true,
        leadAuditor: true,
        guidelineCategory: true,
        members: { user: true },
      },
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

  // --- Audit Member Management ---

  async getMembers(
    auditId: string,
    currentUser?: AuthenticatedUser,
  ): Promise<AuditMember[]> {
    await this.findById(auditId, currentUser);
    return await this.memberRepository.find({
      where: { auditProjectId: auditId },
      relations: { user: true },
      order: { assignedAt: 'ASC' },
    });
  }

  async addMember(
    auditId: string,
    addDto: AddAuditMemberDto,
    currentUser?: AuthenticatedUser,
  ): Promise<AuditMember> {
    const audit = await this.findById(auditId, currentUser);

    // Auditor or Admin can add members. Lead Auditor of the audit can also add.
    if (
      currentUser &&
      currentUser.role !== UserRole.ADMIN &&
      currentUser.role !== UserRole.AUDITOR &&
      currentUser.role !== UserRole.COMPANY_USER
    ) {
      throw new ForbiddenException('You do not have permission to add members to this audit');
    }

    const existing = await this.memberRepository.findOne({
      where: { auditProjectId: auditId, userId: addDto.userId },
    });
    if (existing) {
      throw new ConflictException('User is already assigned to this audit project');
    }

    const member = this.memberRepository.create({
      auditProjectId: auditId,
      userId: addDto.userId,
      roleInAudit: addDto.roleInAudit || AuditMemberRole.AUDITEE_REVIEWER,
    });

    const saved = await this.memberRepository.save(member);
    const reloaded = await this.memberRepository.findOne({
      where: { id: saved.id },
      relations: { user: true },
    });
    return reloaded!;
  }

  async removeMember(
    auditId: string,
    memberId: string,
    currentUser?: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.findById(auditId, currentUser);

    const member = await this.memberRepository.findOne({
      where: { id: memberId, auditProjectId: auditId },
      relations: { user: true },
    });
    if (!member) {
      throw new NotFoundException(`Audit member "${memberId}" not found in this audit`);
    }

    await this.memberRepository.remove(member);
    return { message: 'Member removed from audit successfully' };
  }

  async completeAudit(
    auditId: string,
    currentUser?: AuthenticatedUser,
  ): Promise<{ message: string; audit: AuditProject }> {
    const audit = await this.findById(auditId, currentUser);

    if (
      currentUser &&
      currentUser.role !== UserRole.ADMIN &&
      currentUser.role !== UserRole.AUDITOR
    ) {
      throw new ForbiddenException(
        'Only Administrators or the Lead Auditor can sign off and complete an audit project.',
      );
    }

    audit.status = AuditStatus.COMPLETED;
    audit.completedDate = new Date();
    const saved = await this.auditRepository.save(audit);

    return {
      message: `Audit project "${audit.title}" (${audit.code}) has been successfully completed and certified.`,
      audit: saved,
    };
  }
}

