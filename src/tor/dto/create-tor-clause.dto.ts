import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateTorClauseDto {
  @IsNotEmpty({ message: 'Clause number is required (e.g. A.5.1)' })
  @IsString()
  clauseNumber: string;

  @IsNotEmpty({ message: 'Clause title is required' })
  @IsString()
  @MinLength(2, { message: 'Title must be at least 2 characters' })
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Parent clause ID must be a valid UUID' })
  parentClauseId?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  clauseType?: string;
}
