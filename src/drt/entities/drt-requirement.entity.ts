import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { AuditProject } from '../../audits/entities/audit-project.entity.js';
import { TorClause } from '../../tor/entities/tor-clause.entity.js';
import { User } from '../../users/entities/user.entity.js';
import type { DrtSubmission } from './drt-submission.entity.js';

export enum DrtRequirementStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REVISION_REQUIRED = 'revision_required',
}

@Entity('drt_requirements')
export class DrtRequirement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'text', nullable: true })
  guidance?: string | null;

  @Column({ type: 'boolean', default: true })
  isMandatory: boolean;

  @Column({
    type: 'enum',
    enum: DrtRequirementStatus,
    default: DrtRequirementStatus.PENDING,
  })
  status: DrtRequirementStatus;

  @Column({ type: 'timestamptz', nullable: true })
  dueDate?: Date | null;

  @Index()
  @Column({ type: 'uuid' })
  auditProjectId: string;

  @ManyToOne(() => AuditProject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auditProjectId' })
  auditProject: AuditProject;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  torClauseId?: string | null;

  @ManyToOne(() => TorClause, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'torClauseId' })
  torClause?: TorClause | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  assignedAuditeeId?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignedAuditeeId' })
  assignedAuditee?: User | null;

  @OneToMany('DrtSubmission', 'requirement')
  submissions: DrtSubmission[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
