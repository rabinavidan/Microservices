/**
 * Typed request/response/event contracts exchanged between services.
 * Keeping these in a shared lib means the compiler catches contract
 * drift between a producer and its consumers instead of failing at runtime.
 */

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

/** Discriminated union: callers must check `success` before reading `data`/`error`. */
export type ServiceResult<T> = { success: true; data: T } | { success: false; error: string };

export interface ReserveInventoryRequest {
  orderId: string;
  items: OrderItem[];
}

export interface ReleaseInventoryRequest {
  orderId: string;
  items: OrderItem[];
}

export interface ChargePaymentRequest {
  orderId: string;
  amount: number;
}

export interface ChargePaymentResult {
  transactionId: string;
}

export interface RefundPaymentRequest {
  orderId: string;
  transactionId: string;
}

export interface OrderConfirmedEvent {
  orderId: string;
  totalAmount: number;
  transactionId: string;
}

export interface OrderFailedEvent {
  orderId: string;
  reason: string;
}
