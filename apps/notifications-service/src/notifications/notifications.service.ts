import { Injectable, Logger } from '@nestjs/common';

/**
 * Stand-in for a real notification channel (email/SMS/push). Kept as its
 * own service so the transport concern (EventPattern handlers) stays
 * separate from the "what does a notification actually do" concern.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('NotificationChannel');

  send(subject: string, body: string): void {
    this.logger.log(`[notification] ${subject} - ${body}`);
  }
}
