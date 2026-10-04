import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TorClause } from './entities/tor-clause.entity.js';
import { AuditProject } from '../audits/entities/audit-project.entity.js';
import { DrtRequirement } from '../drt/entities/drt-requirement.entity.js';
import { TorService } from './tor.service.js';
import { TorController } from './tor.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([TorClause, AuditProject, DrtRequirement]),
    NotificationsModule,
  ],
  controllers: [TorController],
  providers: [TorService],
  exports: [TorService, TypeOrmModule],
})
export class TorModule {}
