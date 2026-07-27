import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NOTIFICATION_EVENTS, OrderConfirmedEvent, OrderFailedEvent } from '@app/common';
import { NotificationsService } from './notifications.service';

@Controller()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @EventPattern(NOTIFICATION_EVENTS.ORDER_CONFIRMED)
  handleOrderConfirmed(@Payload() event: OrderConfirmedEvent): void {
    this.notifications.send(
      `Order ${event.orderId} confirmed`,
      `Charged $${event.totalAmount} (transaction ${event.transactionId}). Thanks for your order!`,
    );
  }

  @EventPattern(NOTIFICATION_EVENTS.ORDER_FAILED)
  handleOrderFailed(@Payload() event: OrderFailedEvent): void {
    this.notifications.send(`Order ${event.orderId} failed`, event.reason);
  }
}
