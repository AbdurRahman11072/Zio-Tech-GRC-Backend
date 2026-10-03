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
import { AuditProject } from '../audits/entities/audit-project.entity.js';
import { TorClause } from '../tor/entities/tor-clause.entity.js';
import { User, UserRole } from '../users/entities/user.entity.js';
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
    @InjectRepository(TorClause)
    private readonly torRepository: Repository<TorClause>,
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
      },
    });

    if (!requirement) {
      throw new NotFoundException(`DRT requirement "${requirementId}" not found`);
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
