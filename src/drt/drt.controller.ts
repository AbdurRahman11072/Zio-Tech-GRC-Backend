import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Res,
  UseInterceptors,
  UploadedFiles,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
const diskStorage = multer.diskStorage;
import type { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { DrtService } from './drt.service.js';
import { CreateDrtRequirementDto } from './dto/create-drt-requirement.dto.js';
import { UpdateDrtRequirementDto } from './dto/update-drt-requirement.dto.js';
import { ReviewDrtSubmissionDto } from './dto/review-drt-submission.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';

const uploadDir = './uploads/evidence';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedExtensions = [
  '.pdf',
  '.docx',
  '.xlsx',
  '.csv',
  '.png',
  '.jpg',
  '.jpeg',
  '.zip',
  '.txt',
];

const multerStorage = diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const multerOptions = {
  storage: multerStorage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
  },
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestException(
          `Unsupported file type "${ext}". Allowed formats: ${allowedExtensions.join(', ')}`,
        ),
        false,
      );
    }
  },
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class DrtController {
  constructor(private readonly drtService: DrtService) {}

  @Get('drt')
  findAll(@Req() req: any) {
    return this.drtService.findAll(req.user);
  }

  @Get('audits/:auditId/drt')
  findByAuditProject(
    @Param('auditId', ParseUUIDPipe) auditId: string,
    @Req() req: any,
  ) {
    return this.drtService.findByAuditProject(auditId, req.user);
  }

  @Get('audits/:auditId/drt/progress')
  getProgress(
    @Param('auditId', ParseUUIDPipe) auditId: string,
    @Req() req: any,
  ) {
    return this.drtService.getAuditDrtProgress(auditId, req.user);
  }

  @Post('audits/:auditId/drt/sync-tor')
  syncFromTor(@Param('auditId', ParseUUIDPipe) auditId: string) {
    return this.drtService.syncFromTorClauses(auditId);
  }

  @Post('audits/:auditId/drt/submit-all')
  submitAllEvidence(
    @Param('auditId', ParseUUIDPipe) auditId: string,
    @Req() req: any,
  ) {
    return this.drtService.submitAllEvidence(auditId, req.user);
  }

  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  @Post('audits/:auditId/drt')
  create(
    @Param('auditId', ParseUUIDPipe) auditId: string,
    @Body() createDto: CreateDrtRequirementDto,
  ) {
    return this.drtService.create(auditId, createDto);
  }

  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  @Patch('drt/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateDrtRequirementDto,
  ) {
    return this.drtService.update(id, updateDto);
  }

  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  @Delete('drt/:id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.drtService.remove(id);
  }

  @Post('drt/:id/submit')
  @UseInterceptors(FilesInterceptor('files', 10, multerOptions))
  submitEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('notes') notes: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    return this.drtService.submitEvidence(id, req.user, notes, files);
  }

  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  @Post('drt/:id/review')
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() reviewDto: ReviewDrtSubmissionDto,
    @Req() req: any,
  ) {
    return this.drtService.reviewSubmission(id, req.user, reviewDto);
  }

  @Get('evidence/:fileId/download')
  async downloadFile(
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Res() res: Response,
  ) {
    const file = await this.drtService.getEvidenceFile(fileId);
    const resolvedPath = path.resolve(file.filePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new BadRequestException('Evidence file not found on disk');
    }

    res.download(resolvedPath, file.originalName);
  }
}
