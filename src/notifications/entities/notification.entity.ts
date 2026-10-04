import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum NotificationType {
  TOR_FINALIZED_UPLOAD_REQUIRED = 'TOR_FINALIZED_UPLOAD_REQUIRED',
  EVIDENCE_UPLOADED_REVIEW_REQUIRED = 'EVIDENCE_UPLOADED_REVIEW_REQUIRED',
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  GENERAL = 'GENERAL',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  recipientEmail: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  recipientUserId?: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  companyId?: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  auditProjectId?: string | null;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.GENERAL,
  })
  type: NotificationType;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'boolean', default: true })
  emailSent: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
