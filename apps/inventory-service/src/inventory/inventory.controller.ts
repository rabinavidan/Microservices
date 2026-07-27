import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { INVENTORY_PATTERNS, ReleaseInventoryRequest, ReserveInventoryRequest } from '@app/common';
import { InventoryService } from './inventory.service';

@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @MessagePattern(INVENTORY_PATTERNS.FIND_ALL)
  findAll() {
    return this.inventoryService.findAll();
  }

  @MessagePattern(INVENTORY_PATTERNS.RESERVE)
  reserve(@Payload() request: ReserveInventoryRequest) {
    return this.inventoryService.reserve(request);
  }

  @MessagePattern(INVENTORY_PATTERNS.RELEASE)
  release(@Payload() request: ReleaseInventoryRequest) {
    return this.inventoryService.release(request);
  }
}
