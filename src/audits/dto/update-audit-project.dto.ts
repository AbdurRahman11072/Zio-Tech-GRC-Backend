import { PartialType } from '@nestjs/mapped-types';
import { CreateAuditProjectDto } from './create-audit-project.dto.js';

export class UpdateAuditProjectDto extends PartialType(CreateAuditProjectDto) {}
