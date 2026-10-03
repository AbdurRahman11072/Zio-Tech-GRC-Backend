import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ReviewDecision } from '../entities/review-remark.entity.js';

export class ReviewDrtSubmissionDto {
  @IsEnum(ReviewDecision)
  @IsNotEmpty()
  decision: ReviewDecision;

  @IsString()
  @IsNotEmpty()
  comment: string;
}
