import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import {
  AuditFramework,
  AuditStatus,
} from '../entities/audit-project.entity.js';

export class CreateAuditProjectDto {
  @IsNotEmpty({ message: 'Audit title is required' })
  @IsString()
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  title: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(AuditFramework)
  framework?: AuditFramework;

  @IsOptional()
  @IsEnum(AuditStatus)
  status?: AuditStatus;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsNotEmpty({ message: 'Company ID is required' })
  @IsUUID('4', { message: 'Valid company UUID is required' })
  companyId: string;

  @IsOptional()
  @IsUUID('4', { message: 'Lead auditor must be a valid UUID' })
  leadAuditorId?: string;
}
