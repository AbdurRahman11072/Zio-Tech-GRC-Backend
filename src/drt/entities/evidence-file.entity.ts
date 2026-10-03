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

@Entity('evidence_files')
export class EvidenceFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  submissionId: string;

  @ManyToOne('DrtSubmission', 'evidenceFiles', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'submissionId' })
  submission: DrtSubmission;

  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Column({ type: 'varchar', length: 255 })
  originalName: string;

  @Column({ type: 'varchar', length: 150 })
  mimeType: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column({ type: 'text' })
  filePath: string;

  @Column({ type: 'uuid', nullable: true })
  uploadedById?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy?: User | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
