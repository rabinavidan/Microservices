import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { of } from 'rxjs';
import { NOTIFICATION_EVENTS, OrderStatus, SERVICE_NAMES } from '@app/common';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';

describe('OrdersService', () => {
  let service: OrdersService;
  let repository: { create: jest.Mock; save: jest.Mock };
  let inventoryClient: { send: jest.Mock; emit: jest.Mock };
  let paymentsClient: { send: jest.Mock; emit: jest.Mock };
  let notificationsClient: { send: jest.Mock; emit: jest.Mock };

  const dto: CreateOrderDto = {
    items: [{ productId: 'sku-001', quantity: 2, unitPrice: 25 }],
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn((entity) => entity),
      // First save assigns an id (simulating INSERT); later saves just echo back the entity.
      save: jest.fn((entity) => Promise.resolve({ id: 'order-1', ...entity })),
    };
    inventoryClient = { send: jest.fn(), emit: jest.fn(() => of(undefined)) };
    paymentsClient = { send: jest.fn(), emit: jest.fn(() => of(undefined)) };
    notificationsClient = { send: jest.fn(), emit: jest.fn(() => of(undefined)) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: repository },
        { provide: SERVICE_NAMES.INVENTORY, useValue: inventoryClient },
        { provide: SERVICE_NAMES.PAYMENTS, useValue: paymentsClient },
        { provide: SERVICE_NAMES.NOTIFICATIONS, useValue: notificationsClient },
      ],
    }).compile();

    service = moduleRef.get(OrdersService);
  });

  it('confirms the order when inventory and payment both succeed', async () => {
    inventoryClient.send.mockReturnValue(of({ success: true, data: undefined }));
    paymentsClient.send.mockReturnValue(of({ success: true, data: { transactionId: 'txn-1' } }));

    const order = await service.createOrder(dto);

    expect(order.status).toBe(OrderStatus.CONFIRMED);
    expect(order.transactionId).toBe('txn-1');
    expect(paymentsClient.send).toHaveBeenCalledWith(
      'payments.charge',
      expect.objectContaining({ orderId: 'order-1', amount: 50 }),
    );
    expect(notificationsClient.emit).toHaveBeenCalledWith(
      NOTIFICATION_EVENTS.ORDER_CONFIRMED,
      expect.objectContaining({ orderId: 'order-1', transactionId: 'txn-1' }),
    );
  });

  it('fails the order without calling payments when inventory reservation fails', async () => {
    inventoryClient.send.mockReturnValue(of({ success: false, error: 'out of stock' }));

    const order = await service.createOrder(dto);

    expect(order.status).toBe(OrderStatus.FAILED);
    expect(order.failureReason).toContain('out of stock');
    expect(paymentsClient.send).not.toHaveBeenCalled();
    expect(notificationsClient.emit).toHaveBeenCalledWith(
      NOTIFICATION_EVENTS.ORDER_FAILED,
      expect.objectContaining({ orderId: 'order-1' }),
    );
  });

  it('compensates the inventory reservation when payment fails', async () => {
    inventoryClient.send.mockReturnValue(of({ success: true, data: undefined }));
    paymentsClient.send.mockReturnValue(of({ success: false, error: 'card declined' }));

    const order = await service.createOrder(dto);

    expect(order.status).toBe(OrderStatus.FAILED);
    expect(order.failureReason).toContain('card declined');
    expect(inventoryClient.send).toHaveBeenCalledWith(
      'inventory.release',
      expect.objectContaining({ orderId: 'order-1' }),
    );
  });

  it('treats a downstream transport failure as a normal saga failure', async () => {
    // Simulates ClientProxy#send() throwing synchronously (e.g. connection refused).
    inventoryClient.send.mockImplementation(() => {
      throw new Error('connect ECONNREFUSED');
    });

    const order = await service.createOrder(dto);

    expect(order.status).toBe(OrderStatus.FAILED);
    expect(order.failureReason).toContain('connect ECONNREFUSED');
  });
});
