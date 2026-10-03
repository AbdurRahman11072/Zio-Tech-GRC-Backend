import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TorClause } from './entities/tor-clause.entity.js';
import { AuditProject } from '../audits/entities/audit-project.entity.js';
import { TorService } from './tor.service.js';
import { TorController } from './tor.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([TorClause, AuditProject])],
  controllers: [TorController],
  providers: [TorService],
  exports: [TorService, TypeOrmModule],
})
export class TorModule {}
