import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TorClause } from './entities/tor-clause.entity.js';
import { AuditProject } from '../audits/entities/audit-project.entity.js';
import { CreateTorClauseDto } from './dto/create-tor-clause.dto.js';
import { UpdateTorClauseDto } from './dto/update-tor-clause.dto.js';

export interface TorClauseTreeNode extends TorClause {
  children: TorClauseTreeNode[];
}

@Injectable()
export class TorService {
  constructor(
    @InjectRepository(TorClause)
    private readonly torRepository: Repository<TorClause>,
    @InjectRepository(AuditProject)
    private readonly auditRepository: Repository<AuditProject>,
  ) {}

  async findByAuditProject(auditProjectId: string): Promise<TorClauseTreeNode[]> {
    const allClauses = await this.torRepository.find({
      where: { auditProjectId },
      order: { sortOrder: 'ASC', clauseNumber: 'ASC' },
    });

    return this.buildTree(allClauses);
  }

  async create(
    auditProjectId: string,
    createDto: CreateTorClauseDto,
  ): Promise<TorClause> {
    const audit = await this.auditRepository.findOne({
      where: { id: auditProjectId },
    });
    if (!audit) {
      throw new NotFoundException(`Audit project with ID "${auditProjectId}" not found`);
    }

    if (createDto.parentClauseId) {
      const parent = await this.torRepository.findOne({
        where: { id: createDto.parentClauseId, auditProjectId },
      });
      if (!parent) {
        throw new BadRequestException('Parent clause not found in this audit project');
      }
    }

    const clause = this.torRepository.create({
      ...createDto,
      auditProjectId,
    });

    return await this.torRepository.save(clause);
  }

  async importFrameworkTemplate(
    auditProjectId: string,
    framework: string,
  ): Promise<TorClauseTreeNode[]> {
    const audit = await this.auditRepository.findOne({
      where: { id: auditProjectId },
    });
    if (!audit) {
      throw new NotFoundException(`Audit project with ID "${auditProjectId}" not found`);
    }

    if (framework === 'SOC_2_TYPE_2') {
      const parentCC1 = await this.torRepository.save(
        this.torRepository.create({
          auditProjectId,
          clauseNumber: 'CC1',
          title: 'Control Environment',
          objective: 'Integrity, ethical values, and oversight of internal controls.',
          sortOrder: 1,
        }),
      );
      await this.torRepository.save([
        this.torRepository.create({
          auditProjectId,
          parentClauseId: parentCC1.id,
          clauseNumber: 'CC1.1',
          title: 'Commitment to Integrity & Ethical Values',
          objective: 'Entity demonstrates adherence to code of conduct and compliance policies.',
          sortOrder: 1,
        }),
        this.torRepository.create({
          auditProjectId,
          parentClauseId: parentCC1.id,
          clauseNumber: 'CC1.2',
          title: 'Board of Directors & Governance Oversight',
          objective: 'Independent board oversight over management execution of internal control.',
          sortOrder: 2,
        }),
      ]);

      const parentCC6 = await this.torRepository.save(
        this.torRepository.create({
          auditProjectId,
          clauseNumber: 'CC6',
          title: 'Logical & Physical Access Controls',
          objective: 'Controls protecting against unauthorized logical and physical access.',
          sortOrder: 2,
        }),
      );
      await this.torRepository.save([
        this.torRepository.create({
          auditProjectId,
          parentClauseId: parentCC6.id,
          clauseNumber: 'CC6.1',
          title: 'User Registration & Access Authorization',
          objective: 'Procedures to provision and de-provision user access credentials.',
          sortOrder: 1,
        }),
        this.torRepository.create({
          auditProjectId,
          parentClauseId: parentCC6.id,
          clauseNumber: 'CC6.2',
          title: 'Multi-Factor Authentication & Credential Strength',
          objective: 'MFA enforcement on all admin and cloud infrastructure access.',
          sortOrder: 2,
        }),
        this.torRepository.create({
          auditProjectId,
          parentClauseId: parentCC6.id,
          clauseNumber: 'CC6.3',
          title: 'Principle of Least Privilege & RBAC',
          objective: 'Role-based access boundaries strictly limiting administrative rights.',
          sortOrder: 3,
        }),
      ]);
    } else {
      // Default to ISO/IEC 27001:2022 Annex A Controls
      const parentA5 = await this.torRepository.save(
        this.torRepository.create({
          auditProjectId,
          clauseNumber: 'A.5',
          title: 'Organizational Controls',
          objective: 'High-level management intent, security roles, and asset stewardship.',
          sortOrder: 1,
        }),
      );
      await this.torRepository.save([
        this.torRepository.create({
          auditProjectId,
          parentClauseId: parentA5.id,
          clauseNumber: 'A.5.1',
          title: 'Policies for Information Security',
          objective: 'Information security policy approved by management and published.',
          sortOrder: 1,
        }),
        this.torRepository.create({
          auditProjectId,
          parentClauseId: parentA5.id,
          clauseNumber: 'A.5.15',
          title: 'Access Control Policy',
          objective: 'Rules to control physical and logical access to information and systems.',
          sortOrder: 2,
        }),
      ]);

      const parentA8 = await this.torRepository.save(
        this.torRepository.create({
          auditProjectId,
          clauseNumber: 'A.8',
          title: 'Technological Controls',
          objective: 'Endpoint security, vulnerability handling, and network safeguards.',
          sortOrder: 2,
        }),
      );
      await this.torRepository.save([
        this.torRepository.create({
          auditProjectId,
          parentClauseId: parentA8.id,
          clauseNumber: 'A.8.7',
          title: 'Protection Against Malware',
          objective: 'Automated malware detection, prevention, and response mechanisms.',
          sortOrder: 1,
        }),
        this.torRepository.create({
          auditProjectId,
          parentClauseId: parentA8.id,
          clauseNumber: 'A.8.20',
          title: 'Network Security & Boundary Segregation',
          objective: 'Network segmentation between corporate and production cloud VPCs.',
          sortOrder: 2,
        }),
        this.torRepository.create({
          auditProjectId,
          parentClauseId: parentA8.id,
          clauseNumber: 'A.8.24',
          title: 'Use of Cryptography',
          objective: 'TLS 1.3 in-transit and AES-256 at-rest encryption standards.',
          sortOrder: 3,
        }),
      ]);
    }

    return await this.findByAuditProject(auditProjectId);
  }

  async update(
    clauseId: string,
    updateDto: UpdateTorClauseDto,
  ): Promise<TorClause> {
    const clause = await this.torRepository.findOne({
      where: { id: clauseId },
    });
    if (!clause) {
      throw new NotFoundException(`TOR clause with ID "${clauseId}" not found`);
    }

    Object.assign(clause, updateDto);
    return await this.torRepository.save(clause);
  }

  async remove(clauseId: string): Promise<{ message: string }> {
    const clause = await this.torRepository.findOne({
      where: { id: clauseId },
    });
    if (!clause) {
      throw new NotFoundException(`TOR clause with ID "${clauseId}" not found`);
    }

    await this.torRepository.remove(clause);
    return {
      message: `TOR clause "${clause.clauseNumber} - ${clause.title}" deleted successfully`,
    };
  }

  private buildTree(clauses: TorClause[]): TorClauseTreeNode[] {
    const nodeMap = new Map<string, TorClauseTreeNode>();
    const roots: TorClauseTreeNode[] = [];

    for (const c of clauses) {
      nodeMap.set(c.id, { ...c, children: [] });
    }

    for (const c of clauses) {
      const node = nodeMap.get(c.id)!;
      if (c.parentClauseId && nodeMap.has(c.parentClauseId)) {
        nodeMap.get(c.parentClauseId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}
