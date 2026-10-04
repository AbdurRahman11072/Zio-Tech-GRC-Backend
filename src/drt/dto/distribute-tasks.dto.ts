import { IsArray, ValidateNested, IsUUID, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class TaskAssignmentItemDto {
  @IsUUID()
  requirementId: string;

  @IsOptional()
  @IsUUID()
  auditeeId?: string | null;
}

export class DistributeTasksDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskAssignmentItemDto)
  assignments: TaskAssignmentItemDto[];
}
