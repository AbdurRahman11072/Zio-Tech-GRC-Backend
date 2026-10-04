import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { AuditMemberRole } from '../entities/audit-member.entity.js';

export class AddAuditMemberDto {
  @IsNotEmpty({ message: 'User ID is required' })
  @IsUUID('4', { message: 'Valid user UUID is required' })
  userId: string;

  @IsOptional()
  @IsEnum(AuditMemberRole, {
    message: 'Role in audit must be lead_auditor, auditee_reviewer, or contributor',
  })
  roleInAudit?: AuditMemberRole;
}
