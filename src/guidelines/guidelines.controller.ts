import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { GuidelinesService } from './guidelines.service.js';
import { CreateGuidelineCategoryDto } from './dto/create-guideline-category.dto.js';
import { UpdateGuidelineCategoryDto } from './dto/update-guideline-category.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('guideline-categories')
export class GuidelinesController {
  constructor(private readonly guidelinesService: GuidelinesService) {}

  @Get()
  findAll(
    @Query('all') all?: string,
    @Req() req?: { user: { role: UserRole } },
  ) {
    // If admin explicitly asks for all (including inactive), show all; otherwise show active
    const showAll = req?.user?.role === UserRole.ADMIN && all === 'true';
    return this.guidelinesService.findAll(!showAll);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.guidelinesService.findById(id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(
    @Body() dto: CreateGuidelineCategoryDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.guidelinesService.create(dto, req.user.id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGuidelineCategoryDto,
  ) {
    return this.guidelinesService.update(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.guidelinesService.remove(id);
  }
}
