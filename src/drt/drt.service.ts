import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DrtRequirement,
  DrtRequirementStatus,
} from './entities/drt-requirement.entity.js';
import { DrtSubmission } from './entities/drt-submission.entity.js';
import { EvidenceFile } from './entities/evidence-file.entity.js';
import {
  ReviewRemark,
  ReviewDecision,
} from './entities/review-remark.entity.js';
import {
  AuditProject,
  AuditStatus,
} from '../audits/entities/audit-project.entity.js';
import {
  AuditMember,
  AuditMemberRole,
} from '../audits/entities/audit-member.entity.js';
import { TorClause } from '../tor/entities/tor-clause.entity.js';
import { User, UserRole } from '../users/entities/user.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationType } from '../notifications/entities/notification.entity.js';
import { CreateDrtRequirementDto } from './dto/create-drt-requirement.dto.js';
import { UpdateDrtRequirementDto } from './dto/update-drt-requirement.dto.js';
import { ReviewDrtSubmissionDto } from './dto/review-drt-submission.dto.js';

export interface UploadedEvidenceFile {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
}

export interface DrtProgressSummary {
  auditId: string;
  auditCode: string;
  auditTitle: string;
  auditStatus: AuditStatus;
  totalRequirements: number;
  uploadedRequirements: number;
  pendingRequirements: number;
  approvedRequirements: number;
  revisionRequiredRequirements: number;
  completionPercentage: number;
  isAllUploaded: boolean;
  leadAuditor: { id: string; name: string; email: string } | null;
}

@Injectable()
export class DrtService {
  constructor(
    @InjectRepository(DrtRequirement)
    private readonly reqRepository: Repository<DrtRequirement>,
    @InjectRepository(DrtSubmission)
    private readonly subRepository: Repository<DrtSubmission>,
    @InjectRepository(EvidenceFile)
    private readonly fileRepository: Repository<EvidenceFile>,
    @InjectRepository(ReviewRemark)
    private readonly remarkRepository: Repository<ReviewRemark>,
    @InjectRepository(AuditProject)
    private readonly auditRepository: Repository<AuditProject>,
    @InjectRepository(AuditMember)
    private readonly memberRepository: Repository<AuditMember>,
    @InjectRepository(TorClause)
    private readonly torRepository: Repository<TorClause>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(currentUser?: User): Promise<DrtRequirement[]> {
    const where: any = {};
    if (
      currentUser &&
      (currentUser.role === UserRole.AUDITEE ||
        currentUser.role === UserRole.COMPANY_USER)
    ) {
      if (currentUser.companyId) {
        where.auditProject = { companyId: currentUser.companyId };
      }
    }

    return await this.reqRepository.find({
      where,
      relations: {
        auditProject: true,
        torClause: true,
        submissions: {
          submittedBy: true,
          evidenceFiles: true,
          reviewRemarks: {
            reviewer: true,
          },
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async syncFromTorClauses(auditProjectId: string): Promise<DrtRequirement[]> {
    const allClauses = await this.torRepository.find({
      where: { auditProjectId },
      order: { sortOrder: 'ASC', clauseNumber: 'ASC' },
    });
    if (allClauses.length === 0) {
      return [];
    }

    const parentClauseIds = new Set(
      allClauses.map((c) => c.parentClauseId).filter(Boolean) as string[],
    );
    const leafClauses = allClauses.filter((c) => !parentClauseIds.has(c.id));

    const existingReqs = await this.reqRepository.find({
      where: { auditProjectId },
    });
    const existingClauseIds = new Set(
      existingReqs.map((r) => r.torClauseId).filter(Boolean),
    );

    const newReqs = leafClauses
      .filter((c) => !existingClauseIds.has(c.id))
      .map((c) =>
        this.reqRepository.create({
          auditProjectId,
          torClauseId: c.id,
          code: `DRT-${c.clauseNumber}`,
          title: `Evidence for ${c.clauseNumber}: ${c.title}`,
          description:
            c.objective ||
            `Compliance evidence artifacts and documentation supporting ${c.clauseNumber}.`,
          guidance: `Upload verified policy documents, SOPs, architectural diagrams, system configurations, or test logs demonstrating compliance with ${c.title}.`,
          isMandatory: true,
          status: DrtRequirementStatus.PENDING,
        }),
      );

    if (newReqs.length > 0) {
      await this.reqRepository.save(newReqs);
    }

    return await this.reqRepository.find({
      where: { auditProjectId },
      relations: {
        torClause: true,
        submissions: {
          submittedBy: true,
          evidenceFiles: true,
          reviewRemarks: {
            reviewer: true,
          },
        },
      },
      order: {
        code: 'ASC',
        createdAt: 'ASC',
      },
    });
  }

  async findByAuditProject(
    auditProjectId: string,
    currentUser?: User,
  ): Promise<DrtRequirement[]> {
    const audit = await this.auditRepository.findOne({
      where: { id: auditProjectId },
    });
    if (!audit) {
      throw new NotFoundException(`Audit project "${auditProjectId}" not found`);
    }

    if (
      currentUser &&
      (currentUser.role === UserRole.AUDITEE ||
        currentUser.role === UserRole.COMPANY_USER)
    ) {
      if (currentUser.companyId && audit.companyId !== currentUser.companyId) {
        throw new ForbiddenException(
          'You are not authorized to access DRT requirements for this organization',
        );
      }
    }

    const count = await this.reqRepository.count({
      where: { auditProjectId },
    });

    // Auto-sync if requirements are 0 but TOR clauses exist
    if (count === 0) {
      const clauseCount = await this.torRepository.count({
        where: { auditProjectId },
      });
      if (clauseCount > 0) {
        return await this.syncFromTorClauses(auditProjectId);
      }
    }

    return await this.reqRepository.find({
      where: { auditProjectId },
      relations: {
        torClause: true,
        submissions: {
          submittedBy: true,
          evidenceFiles: true,
          reviewRemarks: {
            reviewer: true,
          },
        },
      },
      order: {
        code: 'ASC',
        createdAt: 'ASC',
      },
    });
  }

  async create(
    auditProjectId: string,
    createDto: CreateDrtRequirementDto,
  ): Promise<DrtRequirement> {
    const audit = await this.auditRepository.findOne({
      where: { id: auditProjectId },
    });
    if (!audit) {
      throw new NotFoundException(`Audit project "${auditProjectId}" not found`);
    }

    if (createDto.torClauseId) {
      const clause = await this.torRepository.findOne({
        where: { id: createDto.torClauseId, auditProjectId },
      });
      if (!clause) {
        throw new NotFoundException(
          `TOR clause "${createDto.torClauseId}" not found in this audit project`,
        );
      }
    }

    const requirement = this.reqRepository.create({
      ...createDto,
      auditProjectId,
      dueDate: createDto.dueDate ? new Date(createDto.dueDate) : null,
      status: DrtRequirementStatus.PENDING,
    });

    return await this.reqRepository.save(requirement);
  }

  async update(
    id: string,
    updateDto: UpdateDrtRequirementDto,
  ): Promise<DrtRequirement> {
    const requirement = await this.reqRepository.findOne({ where: { id } });
    if (!requirement) {
      throw new NotFoundException(`DRT requirement "${id}" not found`);
    }

    if (updateDto.dueDate) {
      (updateDto as any).dueDate = new Date(updateDto.dueDate);
    }

    Object.assign(requirement, updateDto);
    return await this.reqRepository.save(requirement);
  }

  async remove(id: string): Promise<{ message: string }> {
    const requirement = await this.reqRepository.findOne({ where: { id } });
    if (!requirement) {
      throw new NotFoundException(`DRT requirement "${id}" not found`);
    }

    await this.reqRepository.remove(requirement);
    return {
      message: `DRT requirement "${requirement.code} - ${requirement.title}" deleted successfully`,
    };
  }

  async getAuditDrtProgress(
    auditProjectId: string,
    currentUser?: User,
  ): Promise<DrtProgressSummary> {
    const audit = await this.auditRepository.findOne({
      where: { id: auditProjectId },
      relations: {
        leadAuditor: true,
        company: true,
        members: { user: true },
      },
    });
    if (!audit) {
      throw new NotFoundException(`Audit project "${auditProjectId}" not found`);
    }

    if (
      currentUser &&
      (currentUser.role === UserRole.AUDITEE ||
        currentUser.role === UserRole.COMPANY_USER)
    ) {
      if (currentUser.companyId && audit.companyId !== currentUser.companyId) {
        throw new ForbiddenException(
          'You are not authorized to access DRT requirements for this organization',
        );
      }
    }

    const requirements = await this.reqRepository.find({
      where: { auditProjectId },
      relations: {
        submissions: {
          evidenceFiles: true,
        },
      },
    });

    const total = requirements.length;
    const uploaded = requirements.filter(
      (r) =>
        r.status !== DrtRequirementStatus.PENDING ||
        (r.submissions &&
          r.submissions.some(
            (s) => s.evidenceFiles && s.evidenceFiles.length > 0,
          )),
    ).length;
    const pending = total - uploaded;
    const approved = requirements.filter(
      (r) => r.status === DrtRequirementStatus.APPROVED,
    ).length;
    const revisionRequired = requirements.filter(
      (r) => r.status === DrtRequirementStatus.REVISION_REQUIRED,
    ).length;
    const isAllUploaded = total > 0 && uploaded === total;
    const completionPercentage =
      total > 0 ? Math.round((uploaded / total) * 100) : 0;

    let leadAuditor = audit.leadAuditor
      ? {
          id: audit.leadAuditor.id,
          name: audit.leadAuditor.name,
          email: audit.leadAuditor.email,
        }
      : null;

    if (!leadAuditor && audit.members) {
      const leadMember = audit.members.find(
        (m) => m.roleInAudit === AuditMemberRole.LEAD_AUDITOR && m.user,
      );
      if (leadMember?.user) {
        leadAuditor = {
          id: leadMember.user.id,
          name: leadMember.user.name,
          email: leadMember.user.email,
        };
      }
    }

    return {
      auditId: audit.id,
      auditCode: audit.code,
      auditTitle: audit.title,
      auditStatus: audit.status,
      totalRequirements: total,
      uploadedRequirements: uploaded,
      pendingRequirements: pending,
      approvedRequirements: approved,
      revisionRequiredRequirements: revisionRequired,
      completionPercentage,
      isAllUploaded,
      leadAuditor,
    };
  }

  async notifyAuditorEvidenceComplete(
    auditProjectId: string,
    currentUser?: User,
  ): Promise<{
    message: string;
    notificationId?: string;
    recipientEmail: string;
    totalUploaded: number;
    totalRequirements: number;
  }> {
    const audit = await this.auditRepository.findOne({
      where: { id: auditProjectId },
      relations: {
        leadAuditor: true,
        company: true,
        members: { user: true },
      },
    });
    if (!audit) {
      throw new NotFoundException(`Audit project "${auditProjectId}" not found`);
    }

    let recipientEmail = audit.leadAuditor?.email;
    let recipientUserId = audit.leadAuditorId;

    if (!recipientEmail && audit.members) {
      const leadMember = audit.members.find(
        (m) => m.roleInAudit === AuditMemberRole.LEAD_AUDITOR && m.user,
      );
      if (leadMember?.user) {
        recipientEmail = leadMember.user.email;
        recipientUserId = leadMember.user.id;
      }
    }

    if (!recipientEmail) {
      const anyAuditor = await this.userRepository.findOne({
        where: { role: UserRole.AUDITOR },
      });
      if (anyAuditor) {
        recipientEmail = anyAuditor.email;
        recipientUserId = anyAuditor.id;
      } else {
        const admin = await this.userRepository.findOne({
          where: { role: UserRole.ADMIN },
        });
        recipientEmail = admin?.email || 'auditor@ziotech.com';
        recipientUserId = admin?.id || null;
      }
    }

    const progress = await this.getAuditDrtProgress(auditProjectId, currentUser);

    // Advance audit status to IN_REVIEW (ready for Auditor task division & verification)
    if (audit.status !== AuditStatus.IN_REVIEW) {
      audit.status = AuditStatus.IN_REVIEW;
      await this.auditRepository.save(audit);
    }

    const notification = await this.notificationsService.create({
      recipientEmail,
      recipientUserId: recipientUserId || undefined,
      companyId: audit.companyId,
      auditProjectId: audit.id,
      title: `Evidence Upload Complete: ${audit.code} Ready for Review`,
      message: `All required compliance evidence files (${progress.uploadedRequirements}/${progress.totalRequirements} items) have been successfully uploaded by the organization for audit project "${audit.title}" (${audit.code}). You may now divide verification tasks among auditees and proceed with review.`,
      type: NotificationType.EVIDENCE_UPLOADED_REVIEW_REQUIRED,
      metadata: {
        auditId: audit.id,
        auditCode: audit.code,
        auditTitle: audit.title,
        totalRequirements: progress.totalRequirements,
        uploadedRequirements: progress.uploadedRequirements,
        submittedByName: currentUser?.name || 'Organization Representative',
        submittedByEmail: currentUser?.email || 'organization@client.com',
        submittedAt: new Date().toISOString(),
      },
    });

    return {
      message: `Evidence upload notification and email dispatched to Lead Auditor (${recipientEmail}). Audit status updated to IN_REVIEW.`,
      notificationId: notification.id,
      recipientEmail,
      totalUploaded: progress.uploadedRequirements,
      totalRequirements: progress.totalRequirements,
    };
  }

  async submitAllEvidence(
    auditProjectId: string,
    currentUser: User,
  ): Promise<{
    message: string;
    notificationId?: string;
    recipientEmail: string;
    progress: DrtProgressSummary;
  }> {
    const progress = await this.getAuditDrtProgress(auditProjectId, currentUser);

    if (progress.totalRequirements === 0) {
      throw new BadRequestException('No DRT requirements defined for this audit project yet.');
    }

    if (!progress.isAllUploaded) {
      throw new BadRequestException(
        `Cannot submit all evidence: ${progress.pendingRequirements} of ${progress.totalRequirements} requirement(s) are still missing evidence documents. Please upload evidence for all requirements before submitting.`,
      );
    }

    const notificationResult = await this.notifyAuditorEvidenceComplete(
      auditProjectId,
      currentUser,
    );

    return {
      message: 'All evidence successfully submitted to the Lead Auditor for review and task division.',
      notificationId: notificationResult.notificationId,
      recipientEmail: notificationResult.recipientEmail,
      progress,
    };
  }

  async submitEvidence(
    requirementId: string,
    user: User,
    notes?: string,
    files?: UploadedEvidenceFile[],
  ): Promise<DrtRequirement> {
    const requirement = await this.reqRepository.findOne({
      where: { id: requirementId },
      relations: {
        submissions: true,
        auditProject: true,
      },
    });

    if (!requirement) {
      throw new NotFoundException(`DRT requirement "${requirementId}" not found`);
    }

    if (
      user &&
      (user.role === UserRole.AUDITEE || user.role === UserRole.COMPANY_USER)
    ) {
      if (user.companyId && requirement.auditProject?.companyId !== user.companyId) {
        throw new ForbiddenException(
          'You are not authorized to submit evidence for this organization',
        );
      }
    }

    const version = (requirement.submissions?.length || 0) + 1;

    const submission = this.subRepository.create({
      requirementId: requirement.id,
      submittedById: user.id,
      notes: notes || '',
      version,
      status: DrtRequirementStatus.SUBMITTED,
    });

    const savedSubmission = await this.subRepository.save(submission);

    if (files && files.length > 0) {
      const evidenceEntities = files.map((f) =>
        this.fileRepository.create({
          submissionId: savedSubmission.id,
          filename: f.filename,
          originalName: f.originalname,
          mimeType: f.mimetype,
          size: f.size,
          filePath: f.path,
          uploadedById: user.id,
        }),
      );
      await this.fileRepository.save(evidenceEntities);
    }

    await this.reqRepository.update(requirementId, {
      status: DrtRequirementStatus.SUBMITTED,
    });

    // Check if this upload completed 100% of required evidence files for the audit project
    const progress = await this.getAuditDrtProgress(requirement.auditProjectId);
    if (progress.isAllUploaded) {
      await this.notifyAuditorEvidenceComplete(requirement.auditProjectId, user);
    }

    return (await this.reqRepository.findOne({
      where: { id: requirementId },
      relations: {
        torClause: true,
        submissions: {
          submittedBy: true,
          evidenceFiles: true,
          reviewRemarks: {
            reviewer: true,
          },
        },
      },
    }))!;
  }

  async reviewSubmission(
    requirementId: string,
    reviewer: User,
    reviewDto: ReviewDrtSubmissionDto,
  ): Promise<DrtRequirement> {
    const requirement = await this.reqRepository.findOne({
      where: { id: requirementId },
      relations: {
        submissions: {
          reviewRemarks: true,
        },
      },
    });

    if (!requirement) {
      throw new NotFoundException(`DRT requirement "${requirementId}" not found`);
    }

    if (!requirement.submissions || requirement.submissions.length === 0) {
      throw new BadRequestException(
        'Cannot review a requirement that has no submissions yet',
      );
    }

    // Get the latest submission
    const latestSubmission = requirement.submissions.sort(
      (a, b) => b.version - a.version,
    )[0];

    const remark = this.remarkRepository.create({
      submissionId: latestSubmission.id,
      reviewerId: reviewer.id,
      decision: reviewDto.decision,
      comment: reviewDto.comment,
    });
    await this.remarkRepository.save(remark);

    const newStatus =
      reviewDto.decision === ReviewDecision.APPROVED
        ? DrtRequirementStatus.APPROVED
        : DrtRequirementStatus.REVISION_REQUIRED;

    await this.subRepository.update(latestSubmission.id, {
      status: newStatus,
    });

    await this.reqRepository.update(requirementId, {
      status: newStatus,
    });

    return (await this.reqRepository.findOne({
      where: { id: requirementId },
      relations: {
        torClause: true,
        submissions: {
          submittedBy: true,
          evidenceFiles: true,
          reviewRemarks: {
            reviewer: true,
          },
        },
      },
    }))!;
  }

  async getEvidenceFile(fileId: string): Promise<EvidenceFile> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException(`Evidence file "${fileId}" not found`);
    }
    return file;
  }
}
