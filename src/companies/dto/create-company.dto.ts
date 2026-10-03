import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { CompanyStatus } from '../entities/company.entity.js';

export class CreateCompanyDto {
  @IsNotEmpty({ message: 'Company name is required' })
  @IsString()
  @MinLength(2, { message: 'Company name must be at least 2 characters' })
  name: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid contact email' })
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;
}
