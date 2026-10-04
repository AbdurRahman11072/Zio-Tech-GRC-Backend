import { IsEnum, IsInt, IsOptional, IsDateString } from 'class-validator';
import { SubscriptionPlan, SubscriptionStatus } from '../entities/company.entity.js';

export class UpdateSubscriptionDto {
  @IsEnum(SubscriptionPlan, {
    message: 'Subscription plan must be none, starter, professional, or enterprise',
  })
  plan: SubscriptionPlan;

  @IsEnum(SubscriptionStatus, {
    message: 'Subscription status must be inactive, active, trial, past_due, or cancelled',
  })
  status: SubscriptionStatus;

  @IsOptional()
  @IsInt()
  maxAudits?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
