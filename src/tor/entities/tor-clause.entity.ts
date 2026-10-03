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

@Entity('tor_clauses')
export class TorClause {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  clauseNumber: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'text', nullable: true })
  objective?: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Index()
  @Column({ type: 'varchar', length: 30, default: 'tor' })
  clauseType: string;

  @Index()
  @Column({ type: 'uuid' })
  auditProjectId: string;

  @ManyToOne(() => AuditProject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auditProjectId' })
  auditProject: AuditProject;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  parentClauseId?: string | null;

  @ManyToOne(() => TorClause, (clause) => clause.subClauses, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentClauseId' })
  parentClause?: TorClause | null;

  @OneToMany(() => TorClause, (clause) => clause.parentClause)
  subClauses: TorClause[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
