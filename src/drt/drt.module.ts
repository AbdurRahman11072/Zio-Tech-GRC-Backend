import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DrtRequirement } from './entities/drt-requirement.entity.js';
import { DrtSubmission } from './entities/drt-submission.entity.js';
import { EvidenceFile } from './entities/evidence-file.entity.js';
import { ReviewRemark } from './entities/review-remark.entity.js';
import { AuditProject } from '../audits/entities/audit-project.entity.js';
import { AuditMember } from '../audits/entities/audit-member.entity.js';
import { TorClause } from '../tor/entities/tor-clause.entity.js';
import { User } from '../users/entities/user.entity.js';
import { DrtService } from './drt.service.js';
import { DrtController } from './drt.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DrtRequirement,
      DrtSubmission,
      EvidenceFile,
      ReviewRemark,
      AuditProject,
      AuditMember,
      TorClause,
      User,
    ]),
    NotificationsModule,
  ],
  controllers: [DrtController],
  providers: [DrtService],
  exports: [DrtService],
})
export class DrtModule {}
