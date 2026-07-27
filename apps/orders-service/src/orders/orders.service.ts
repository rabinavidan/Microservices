import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import {
  ChargePaymentResult,
  INVENTORY_PATTERNS,
  NOTIFICATION_EVENTS,
  OrderConfirmedEvent,
  OrderFailedEvent,
  OrderStatus,
  PAYMENTS_PATTERNS,
  SERVICE_NAMES,
  ServiceResult,
} from '@app/common';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';

/**
 * Orchestrated saga for order placement:
 *   1. reserve inventory
 *   2. charge payment
 *   3. mark the order CONFIRMED and emit a notification event
 *
 * If step 2 fails after step 1 succeeded, step 1 is compensated
 * (inventory released) before the order is marked FAILED. This is the
 * orchestration style of the saga pattern: orders-service is the single
 * place that knows the workflow and how to undo it, as opposed to a
 * choreography style where each service reacts to the previous one's
 * events independently.
 */
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order) private readonly repository: Repository<Order>,
    @Inject(SERVICE_NAMES.INVENTORY) private readonly inventoryClient: ClientProxy,
    @Inject(SERVICE_NAMES.PAYMENTS) private readonly paymentsClient: ClientProxy,
    @Inject(SERVICE_NAMES.NOTIFICATIONS) private readonly notificationsClient: ClientProxy,
  ) {}

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const totalAmount = dto.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    let order = await this.repository.save(
      this.repository.create({ items: dto.items, totalAmount, status: OrderStatus.PENDING }),
    );
    this.logger.log(`Order ${order.id} created (PENDING), total $${totalAmount}`);

    const reservation = await this.sendCommand<void>(
      this.inventoryClient,
      INVENTORY_PATTERNS.RESERVE,
      {
        orderId: order.id,
        items: dto.items,
      },
    );
    if (!reservation.success) {
      return this.failOrder(order, `Inventory reservation failed: ${reservation.error}`);
    }

    const charge = await this.sendCommand<ChargePaymentResult>(
      this.paymentsClient,
      PAYMENTS_PATTERNS.CHARGE,
      {
        orderId: order.id,
        amount: totalAmount,
      },
    );
    if (!charge.success) {
      await this.compensateInventory(order, dto);
      return this.failOrder(order, `Payment failed: ${charge.error}`);
    }

    const transactionId = charge.data.transactionId;
    order.status = OrderStatus.CONFIRMED;
    order.transactionId = transactionId;
    order = await this.repository.save(order);

    this.publishEvent<OrderConfirmedEvent>(NOTIFICATION_EVENTS.ORDER_CONFIRMED, {
      orderId: order.id,
      totalAmount,
      transactionId,
    });
    this.logger.log(`Order ${order.id} CONFIRMED (transaction ${transactionId})`);

    return order;
  }

  async findOne(id: string): Promise<Order | null> {
    return this.repository.findOne({ where: { id } });
  }

  private async compensateInventory(order: Order, dto: CreateOrderDto): Promise<void> {
    const release = await this.sendCommand<void>(this.inventoryClient, INVENTORY_PATTERNS.RELEASE, {
      orderId: order.id,
      items: dto.items,
    });
    if (!release.success) {
      // A failed compensation is a genuine incident in a real system (needs alerting /
      // manual reconciliation) since inventory and the order state are now out of sync.
      this.logger.error(`Compensation failed for order ${order.id}: ${release.error}`);
    }
  }

  private async failOrder(order: Order, reason: string): Promise<Order> {
    order.status = OrderStatus.FAILED;
    order.failureReason = reason;
    const saved = await this.repository.save(order);

    this.publishEvent<OrderFailedEvent>(NOTIFICATION_EVENTS.ORDER_FAILED, {
      orderId: order.id,
      reason,
    });
    this.logger.warn(`Order ${order.id} FAILED: ${reason}`);

    return saved;
  }

  /** Wraps a request/response call so transport-level failures (service down, timeout) surface as a normal ServiceResult instead of an unhandled rejection. */
  private async sendCommand<T>(
    client: ClientProxy,
    pattern: string,
    payload: unknown,
  ): Promise<ServiceResult<T>> {
    try {
      return await firstValueFrom(client.send<ServiceResult<T>>(pattern, payload));
    } catch (error) {
      const message = this.extractErrorMessage(error);
      this.logger.error(`Call to "${pattern}" failed: ${message}`);
      return { success: false, error: message };
    }
  }

  /**
   * ClientProxy#emit() returns a "cold" Observable: nothing is actually
   * published on the wire until something subscribes to it. Subscribing
   * here (instead of awaiting/returning it) keeps the publish
   * fire-and-forget from the saga's point of view while still surfacing
   * transport errors to the logs.
   */
  private publishEvent<T>(pattern: string, payload: T): void {
    this.notificationsClient.emit(pattern, payload).subscribe({
      error: (error: unknown) =>
        this.logger.error(`Failed to publish "${pattern}": ${this.extractErrorMessage(error)}`),
    });
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object' && 'error' in error) {
      return String((error as { error: unknown }).error);
    }
    return 'Unknown downstream error';
  }
}
