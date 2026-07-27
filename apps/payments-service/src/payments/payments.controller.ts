import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ChargePaymentRequest, PAYMENTS_PATTERNS, RefundPaymentRequest } from '@app/common';
import { PaymentsService } from './payments.service';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @MessagePattern(PAYMENTS_PATTERNS.CHARGE)
  charge(@Payload() request: ChargePaymentRequest) {
    return this.paymentsService.charge(request);
  }

  @MessagePattern(PAYMENTS_PATTERNS.REFUND)
  refund(@Payload() request: RefundPaymentRequest) {
    return this.paymentsService.refund(request);
  }
}
