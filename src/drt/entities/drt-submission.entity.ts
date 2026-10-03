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
import { DrtRequirementStatus } from './drt-requirement.entity.js';
import type { DrtRequirement } from './drt-requirement.entity.js';
import { User } from '../../users/entities/user.entity.js';
import type { EvidenceFile } from './evidence-file.entity.js';
import type { ReviewRemark } from './review-remark.entity.js';

@Entity('drt_submissions')
export class DrtSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  requirementId: string;

  @ManyToOne('DrtRequirement', 'submissions', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'requirementId' })
  requirement: DrtRequirement;

  @Index()
  @Column({ type: 'uuid' })
  submittedById: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submittedById' })
  submittedBy: User;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({
    type: 'enum',
    enum: DrtRequirementStatus,
    default: DrtRequirementStatus.SUBMITTED,
  })
  status: DrtRequirementStatus;

  @OneToMany('EvidenceFile', 'submission')
  evidenceFiles: EvidenceFile[];

  @OneToMany('ReviewRemark', 'submission')
  reviewRemarks: ReviewRemark[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
