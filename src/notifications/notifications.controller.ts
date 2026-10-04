import {
  Controller,
  Get,
  Patch,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Req() req: { user: any }) {
    return this.notificationsService.findAllForUser(req.user);
  }

  @Patch(':id/read')
  markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: any },
  ) {
    return this.notificationsService.markAsRead(id, req.user);
  }

  @Patch('read-all')
  markAllAsRead(@Req() req: { user: any }) {
    return this.notificationsService.markAllAsRead(req.user);
  }
}
