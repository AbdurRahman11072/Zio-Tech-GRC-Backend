import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditsService } from './audits.service.js';
import { AuditsController } from './audits.controller.js';
import { AuditProject } from './entities/audit-project.entity.js';

import { CompaniesModule } from '../companies/companies.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditProject]),
    CompaniesModule,
  ],
  controllers: [AuditsController],
  providers: [AuditsService],
  exports: [AuditsService, TypeOrmModule],
})
export class AuditsModule {}
