import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import { TorService } from './tor.service.js';
import { CreateTorClauseDto } from './dto/create-tor-clause.dto.js';
import { UpdateTorClauseDto } from './dto/update-tor-clause.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class TorController {
  constructor(private readonly torService: TorService) {}

  @Get('tor')
  findAll(
    @Query('type') type?: string,
    @Query('auditProjectId') auditProjectId?: string,
  ) {
    return this.torService.findAll(type, auditProjectId);
  }

  @Get('audits/:auditId/tor')
  findByAuditProject(@Param('auditId', ParseUUIDPipe) auditId: string) {
    return this.torService.findByAuditProject(auditId);
  }

  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  @Post('audits/:auditId/tor')
  create(
    @Param('auditId', ParseUUIDPipe) auditId: string,
    @Body() createDto: CreateTorClauseDto,
  ) {
    return this.torService.create(auditId, createDto);
  }

  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  @Post('audits/:auditId/tor/import-template')
  importTemplate(
    @Param('auditId', ParseUUIDPipe) auditId: string,
    @Query('framework') framework: string,
  ) {
    return this.torService.importFrameworkTemplate(auditId, framework || 'ISO_27001');
  }

  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  @Patch('tor/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateTorClauseDto,
  ) {
    return this.torService.update(id, updateDto);
  }

  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  @Delete('tor/:id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.torService.remove(id);
  }
}
