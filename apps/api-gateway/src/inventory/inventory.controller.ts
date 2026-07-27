import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { INVENTORY_PATTERNS, SERVICE_NAMES } from '@app/common';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(@Inject(SERVICE_NAMES.INVENTORY) private readonly inventoryClient: ClientProxy) {}

  @Get()
  @ApiOperation({ summary: 'List current catalog stock levels' })
  findAll() {
    return firstValueFrom(this.inventoryClient.send(INVENTORY_PATTERNS.FIND_ALL, {}));
  }
}
