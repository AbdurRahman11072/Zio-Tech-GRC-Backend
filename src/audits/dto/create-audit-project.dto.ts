import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateIf,
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

  // Only validate enum if the field is actually present in the request body.
  // With transform:true in ValidationPipe, @IsOptional alone can fire @IsEnum
  // on undefined values. @ValidateIf ensures the check is fully skipped.
  @ValidateIf((o) => o.framework !== undefined && o.framework !== null)
  @IsEnum(AuditFramework, {
    message: `framework must be one of: ${Object.values(AuditFramework).join(', ')}`,
  })
  framework?: AuditFramework;

  @ValidateIf((o) => o.status !== undefined && o.status !== null)
  @IsEnum(AuditStatus, {
    message: `status must be one of: ${Object.values(AuditStatus).join(', ')}`,
  })
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

  @IsOptional()
  @IsUUID('4', { message: 'Valid company UUID is required' })
  companyId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Lead auditor must be a valid UUID' })
  leadAuditorId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Guideline category must be a valid UUID' })
  guidelineCategoryId?: string;

  @IsOptional()
  @IsUUID('4', { each: true, message: 'Each auditee must be a valid UUID' })
  auditeeIds?: string[];
}
