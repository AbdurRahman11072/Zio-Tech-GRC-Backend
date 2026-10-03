import { IsOptional, IsString } from 'class-validator';

export class SubmitEvidenceDto {
  @IsString()
  @IsOptional()
  notes?: string;
}
