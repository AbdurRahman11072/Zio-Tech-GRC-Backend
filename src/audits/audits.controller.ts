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
  Req,
} from '@nestjs/common';
import { AuditsService } from './audits.service.js';
import { CreateAuditProjectDto } from './dto/create-audit-project.dto.js';
import { UpdateAuditProjectDto } from './dto/update-audit-project.dto.js';
import { AddAuditMemberDto } from './dto/add-audit-member.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audits')
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Roles(UserRole.ADMIN, UserRole.AUDITOR, UserRole.COMPANY_USER)
  @Post()
  create(
    @Body() createAuditDto: CreateAuditProjectDto,
    @Req() req: { user: any },
  ) {
    if (req.user?.role === UserRole.COMPANY_USER && req.user?.companyId) {
      createAuditDto.companyId = req.user.companyId;
    }
    return this.auditsService.create(createAuditDto, req.user);
  }

  @Get()
  findAll(@Req() req: { user: any }) {
    return this.auditsService.findAll(req.user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: any },
  ) {
    return this.auditsService.findById(id, req.user);
  }

  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAuditDto: UpdateAuditProjectDto,
    @Req() req: { user: any },
  ) {
    return this.auditsService.update(id, updateAuditDto, req.user);
  }

  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  @Post(':id/complete')
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: any },
  ) {
    return this.auditsService.completeAudit(id, req.user);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: any },
  ) {
    return this.auditsService.remove(id, req.user);
  }

  // --- Audit Member Endpoints ---

  @Get(':id/members')
  getMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: any },
  ) {
    return this.auditsService.getMembers(id, req.user);
  }

  @Roles(UserRole.ADMIN, UserRole.AUDITOR, UserRole.COMPANY_USER)
  @Post(':id/members')
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() addMemberDto: AddAuditMemberDto,
    @Req() req: { user: any },
  ) {
    return this.auditsService.addMember(id, addMemberDto, req.user);
  }

  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  @Delete(':id/members/:memberId')
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Req() req: { user: any },
  ) {
    return this.auditsService.removeMember(id, memberId, req.user);
  }
}

