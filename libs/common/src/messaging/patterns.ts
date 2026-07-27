/**
 * Message pattern / event name constants shared by every service so that
 * publishers and consumers stay in sync at compile time (typo in a string
 * pattern is a classic source of silent microservice failures).
 */

export const ORDERS_PATTERNS = {
  CREATE: 'orders.create',
  FIND_ONE: 'orders.findOne',
} as const;

export const INVENTORY_PATTERNS = {
  RESERVE: 'inventory.reserve',
  RELEASE: 'inventory.release',
  FIND_ALL: 'inventory.findAll',
} as const;

export const PAYMENTS_PATTERNS = {
  CHARGE: 'payments.charge',
  REFUND: 'payments.refund',
} as const;

/** Fire-and-forget events (consumed with @EventPattern). */
export const NOTIFICATION_EVENTS = {
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_FAILED: 'order.failed',
} as const;

export const SERVICE_NAMES = {
  ORDERS: 'ORDERS_SERVICE',
  PAYMENTS: 'PAYMENTS_SERVICE',
  INVENTORY: 'INVENTORY_SERVICE',
  NOTIFICATIONS: 'NOTIFICATIONS_SERVICE',
} as const;
