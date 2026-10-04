import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AuditProject } from './audit-project.entity.js';
import { User } from '../../users/entities/user.entity.js';

export enum AuditMemberRole {
  LEAD_AUDITOR = 'lead_auditor',
  AUDITEE_REVIEWER = 'auditee_reviewer',
  CONTRIBUTOR = 'contributor',
}

@Entity('audit_members')
export class AuditMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  auditProjectId: string;

  @ManyToOne(() => AuditProject, (audit) => audit.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'auditProjectId' })
  auditProject: AuditProject;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: AuditMemberRole,
    default: AuditMemberRole.AUDITEE_REVIEWER,
  })
  roleInAudit: AuditMemberRole;

  @CreateDateColumn({ type: 'timestamptz' })
  assignedAt: Date;
}
