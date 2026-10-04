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
  ForbiddenException,
} from '@nestjs/common';
import { CompaniesService } from './companies.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  @Post()
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.create(createCompanyDto);
  }

  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  @Get()
  findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: { role: UserRole; companyId?: string | null } },
  ) {
    // If client user or auditee, ensure they can only view their own assigned company
    if (
      (req.user.role === UserRole.COMPANY_USER ||
        req.user.role === UserRole.AUDITEE) &&
      req.user.companyId !== id
    ) {
      throw new ForbiddenException(
        'Access denied: You can only view your own company profile',
      );
    }
    return await this.companiesService.findById(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    return this.companiesService.update(id, updateCompanyDto);
  }

  @Patch(':id/subscription')
  updateSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
    @Req() req: { user: { role: UserRole; companyId?: string | null } },
  ) {
    if (req.user.role !== UserRole.ADMIN && req.user.companyId !== id) {
      throw new ForbiddenException(
        'Access denied: You can only manage subscription for your own company',
      );
    }
    return this.companiesService.updateSubscription(id, updateSubscriptionDto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.companiesService.remove(id);
  }
}
