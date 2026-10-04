import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  MinLength,
} from 'class-validator';

export class CreateGuidelineCategoryDto {
  @IsNotEmpty({ message: 'Category name is required' })
  @IsString()
  @MinLength(2, { message: 'Category name must be at least 2 characters' })
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
