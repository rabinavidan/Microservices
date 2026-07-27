"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVICE_NAMES = exports.NOTIFICATION_EVENTS = exports.PAYMENTS_PATTERNS = exports.INVENTORY_PATTERNS = exports.ORDERS_PATTERNS = void 0;
exports.ORDERS_PATTERNS = {
    CREATE: 'orders.create',
    FIND_ONE: 'orders.findOne',
};
exports.INVENTORY_PATTERNS = {
    RESERVE: 'inventory.reserve',
    RELEASE: 'inventory.release',
    FIND_ALL: 'inventory.findAll',
};
exports.PAYMENTS_PATTERNS = {
    CHARGE: 'payments.charge',
    REFUND: 'payments.refund',
};
exports.NOTIFICATION_EVENTS = {
    ORDER_CONFIRMED: 'order.confirmed',
    ORDER_FAILED: 'order.failed',
};
exports.SERVICE_NAMES = {
    ORDERS: 'ORDERS_SERVICE',
    PAYMENTS: 'PAYMENTS_SERVICE',
    INVENTORY: 'INVENTORY_SERVICE',
    NOTIFICATIONS: 'NOTIFICATIONS_SERVICE',
};
//# sourceMappingURL=patterns.js.map