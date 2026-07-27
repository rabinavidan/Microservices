import { Column, Entity, PrimaryColumn, VersionColumn } from 'typeorm';

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryColumn()
  productId: string;

  @Column()
  name: string;

  @Column('int')
  quantityAvailable: number;

  /** Optimistic-locking column: guards against lost updates under concurrent reservations. */
  @VersionColumn()
  version: number;
}
