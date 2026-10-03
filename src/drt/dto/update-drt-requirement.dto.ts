import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { DrtRequirementStatus } from '../entities/drt-requirement.entity.js';

export class UpdateDrtRequirementDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  guidance?: string;

  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsUUID()
  @IsOptional()
  torClauseId?: string;

  @IsEnum(DrtRequirementStatus)
  @IsOptional()
  status?: DrtRequirementStatus;
}
