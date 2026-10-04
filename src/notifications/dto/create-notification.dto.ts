import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { NotificationType } from '../entities/notification.entity.js';

export class CreateNotificationDto {
  @IsNotEmpty({ message: 'Recipient email is required' })
  @IsEmail({}, { message: 'Valid recipient email is required' })
  recipientEmail: string;

  @IsOptional()
  @IsUUID('4')
  recipientUserId?: string | null;

  @IsOptional()
  @IsUUID('4')
  companyId?: string | null;

  @IsOptional()
  @IsUUID('4')
  auditProjectId?: string | null;

  @IsNotEmpty({ message: 'Notification title is required' })
  @IsString()
  title: string;

  @IsNotEmpty({ message: 'Notification message body is required' })
  @IsString()
  message: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  metadata?: Record<string, any> | null;
}
