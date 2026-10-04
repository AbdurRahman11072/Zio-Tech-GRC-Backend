import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';
import { UserRole } from '../users/entities/user.entity.js';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  companyId?: string | null;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async create(createDto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create({
      ...createDto,
      type: createDto.type || NotificationType.GENERAL,
      isRead: false,
      emailSent: true,
    });

    const saved = await this.notificationRepository.save(notification);

    // Simulated high-reliability Email Dispatcher Log
    this.logger.log(
      `\n------------------------------------------------------------` +
      `\n📧 [EMAIL DISPATCHED] To: ${saved.recipientEmail}` +
      `\n📋 Type: ${saved.type}` +
      `\n📌 Subject: ${saved.title}` +
      `\n📝 Message: ${saved.message}` +
      `\n🔗 Metadata: ${JSON.stringify(saved.metadata || {})}` +
      `\n------------------------------------------------------------`,
    );

    return saved;
  }

  async findAllForUser(currentUser: AuthenticatedUser): Promise<Notification[]> {
    const query = this.notificationRepository.createQueryBuilder('notification');

    // Admin sees all system notifications
    if (currentUser.role === UserRole.ADMIN) {
      return await query.orderBy('notification.createdAt', 'DESC').limit(100).getMany();
    }

    // Client/Auditor/Auditee sees notifications matching user ID, email, or their company
    query.where('notification.recipientUserId = :userId', { userId: currentUser.id })
      .orWhere('notification.recipientEmail = :email', { email: currentUser.email });

    if (currentUser.companyId) {
      query.orWhere('notification.companyId = :companyId', { companyId: currentUser.companyId });
    }

    return await query.orderBy('notification.createdAt', 'DESC').limit(50).getMany();
  }

  async markAsRead(id: string, currentUser: AuthenticatedUser): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID "${id}" not found`);
    }

    notification.isRead = true;
    return await this.notificationRepository.save(notification);
  }

  async markAllAsRead(currentUser: AuthenticatedUser): Promise<{ count: number }> {
    const notifications = await this.findAllForUser(currentUser);
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);

    if (unreadIds.length > 0) {
      await this.notificationRepository
        .createQueryBuilder()
        .update(Notification)
        .set({ isRead: true })
        .whereInIds(unreadIds)
        .execute();
    }

    return { count: unreadIds.length };
  }
}
