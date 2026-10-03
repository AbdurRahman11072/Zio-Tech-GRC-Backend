import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { DrtSubmission } from './drt-submission.entity.js';
import { User } from '../../users/entities/user.entity.js';

export enum ReviewDecision {
  APPROVED = 'approved',
  REVISION_REQUIRED = 'revision_required',
  COMMENT = 'comment',
}

@Entity('review_remarks')
export class ReviewRemark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  submissionId: string;

  @ManyToOne('DrtSubmission', 'reviewRemarks', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'submissionId' })
  submission: DrtSubmission;

  @Index()
  @Column({ type: 'uuid' })
  reviewerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewerId' })
  reviewer: User;

  @Column({
    type: 'enum',
    enum: ReviewDecision,
    default: ReviewDecision.COMMENT,
  })
  decision: ReviewDecision;

  @Column({ type: 'text' })
  comment: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
