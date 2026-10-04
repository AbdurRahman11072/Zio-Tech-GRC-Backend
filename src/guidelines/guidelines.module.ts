import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuidelineCategory } from './entities/guideline-category.entity.js';
import { GuidelinesService } from './guidelines.service.js';
import { GuidelinesController } from './guidelines.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([GuidelineCategory])],
  controllers: [GuidelinesController],
  providers: [GuidelinesService],
  exports: [GuidelinesService, TypeOrmModule],
})
export class GuidelinesModule {}
