import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

export enum CompanyStatus {
  ACTIVE = 'active',
  PENDING_REVIEW = 'pending_review',
  INACTIVE = 'inactive',
}

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 200, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  registrationNumber?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  industry?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  domain?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl?: string | null;

  @Column({
    type: 'enum',
    enum: CompanyStatus,
    default: CompanyStatus.ACTIVE,
  })
  status: CompanyStatus;

  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contactEmail?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contactPhone?: string | null;

  @OneToMany(() => User, (user) => user.company)
  users: User[];

  @OneToMany('AuditProject', 'company')
  audits: any[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
