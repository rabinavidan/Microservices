import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ReleaseInventoryRequest, ReserveInventoryRequest, ServiceResult } from '@app/common';
import { DataSource, Repository } from 'typeorm';
import { InventoryItem } from './entities/inventory-item.entity';

@Injectable()
export class InventoryService implements OnModuleInit {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(InventoryItem) private readonly repository: Repository<InventoryItem>,
    private readonly dataSource: DataSource,
  ) {}

  /** Seed a small demo catalog so the saga has real products to reserve against. */
  async onModuleInit(): Promise<void> {
    const count = await this.repository.count();
    if (count > 0) return;

    await this.repository.save([
      { productId: 'sku-001', name: 'Wireless Mouse', quantityAvailable: 50 },
      { productId: 'sku-002', name: 'Mechanical Keyboard', quantityAvailable: 30 },
      { productId: 'sku-003', name: 'USB-C Hub', quantityAvailable: 100 },
    ]);
    this.logger.log('Seeded demo inventory catalog');
  }

  /**
   * Reserves stock for every line item inside a single DB transaction,
   * taking a pessimistic write lock on each row to prevent two concurrent
   * orders from over-selling the same SKU. Any failure rolls back the
   * whole reservation (all-or-nothing), which is what lets orders-service
   * treat this call as a single saga step.
   */
  async reserve(request: ReserveInventoryRequest): Promise<ServiceResult<void>> {
    try {
      await this.dataSource.transaction(async (manager) => {
        for (const item of request.items) {
          const record = await manager.findOne(InventoryItem, {
            where: { productId: item.productId },
            lock: { mode: 'pessimistic_write' },
          });

          if (!record) {
            throw new Error(`Unknown product ${item.productId}`);
          }
          if (record.quantityAvailable < item.quantity) {
            throw new Error(
              `Insufficient stock for ${item.productId}: requested ${item.quantity}, available ${record.quantityAvailable}`,
            );
          }

          record.quantityAvailable -= item.quantity;
          await manager.save(record);
        }
      });

      this.logger.log(`Reserved inventory for order ${request.orderId}`);
      return { success: true, data: undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown reservation error';
      this.logger.warn(`Reservation failed for order ${request.orderId}: ${message}`);
      return { success: false, error: message };
    }
  }

  async findAll(): Promise<InventoryItem[]> {
    return this.repository.find();
  }

  /** Compensating action used by the orders-service saga when a later step (payment) fails. */
  async release(request: ReleaseInventoryRequest): Promise<ServiceResult<void>> {
    await this.dataSource.transaction(async (manager) => {
      for (const item of request.items) {
        await manager.increment(
          InventoryItem,
          { productId: item.productId },
          'quantityAvailable',
          item.quantity,
        );
      }
    });

    this.logger.log(`Released inventory for order ${request.orderId}`);
    return { success: true, data: undefined };
  }
}
