import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity.js';
import { User } from '../../users/entities/user.entity.js';

export enum AuditFramework {
  ISO_27001 = 'ISO_27001',
  SOC_2_TYPE_2 = 'SOC_2_TYPE_2',
  NIST_CSF = 'NIST_CSF',
  PCI_DSS = 'PCI_DSS',
  HIPAA = 'HIPAA',
  CUSTOM = 'CUSTOM',
}

export enum AuditStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  FIELDWORK = 'fieldwork',
  IN_REVIEW = 'in_review',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

@Entity('audit_projects')
export class AuditProject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    type: 'enum',
    enum: AuditFramework,
    default: AuditFramework.ISO_27001,
  })
  framework: AuditFramework;

  @Column({
    type: 'enum',
    enum: AuditStatus,
    default: AuditStatus.DRAFT,
  })
  status: AuditStatus;

  @Column({ type: 'text', nullable: true })
  scope?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  startDate?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  targetDate?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedDate?: Date | null;

  @Column({ type: 'uuid' })
  companyId: string;

  @ManyToOne('Company', 'audits', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column({ type: 'uuid', nullable: true })
  leadAuditorId?: string | null;

  @ManyToOne('User', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'leadAuditorId' })
  leadAuditor?: User | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
