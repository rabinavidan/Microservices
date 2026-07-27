import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ChargePaymentRequest,
  ChargePaymentResult,
  RefundPaymentRequest,
  ServiceResult,
} from '@app/common';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';

/** Above this amount the simulated payment gateway declines the charge, so the saga's compensation path is exercisable end-to-end. */
const DECLINE_THRESHOLD = 5000;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(@InjectRepository(Payment) private readonly repository: Repository<Payment>) {}

  async charge(request: ChargePaymentRequest): Promise<ServiceResult<ChargePaymentResult>> {
    // Idempotency: replaying the same orderId (e.g. a retried saga step) must not double-charge.
    const existing = await this.repository.findOne({
      where: { orderId: request.orderId, status: PaymentStatus.CAPTURED },
    });
    if (existing) {
      this.logger.log(
        `Idempotent replay for order ${request.orderId}, reusing transaction ${existing.id}`,
      );
      return { success: true, data: { transactionId: existing.id } };
    }

    if (request.amount <= 0) {
      return { success: false, error: 'Invalid charge amount' };
    }

    if (request.amount > DECLINE_THRESHOLD) {
      const error = `Payment declined: amount ${request.amount} exceeds limit of ${DECLINE_THRESHOLD}`;
      this.logger.warn(`Order ${request.orderId}: ${error}`);
      return { success: false, error };
    }

    const payment = await this.repository.save(
      this.repository.create({
        orderId: request.orderId,
        amount: request.amount,
        status: PaymentStatus.CAPTURED,
      }),
    );

    this.logger.log(
      `Charged ${request.amount} for order ${request.orderId} (transaction ${payment.id})`,
    );
    return { success: true, data: { transactionId: payment.id } };
  }

  /** Compensating action used by the orders-service saga when a later step fails after payment already succeeded. */
  async refund(request: RefundPaymentRequest): Promise<ServiceResult<void>> {
    await this.repository.update(
      { id: request.transactionId, orderId: request.orderId },
      { status: PaymentStatus.REFUNDED },
    );
    this.logger.log(`Refunded transaction ${request.transactionId} for order ${request.orderId}`);
    return { success: true, data: undefined };
  }
}
