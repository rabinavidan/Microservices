import { Body, Controller, Get, Inject, NotFoundException, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ORDERS_PATTERNS, SERVICE_NAMES } from '@app/common';
import { CreateOrderDto } from './dto/create-order.dto';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(@Inject(SERVICE_NAMES.ORDERS) private readonly ordersClient: ClientProxy) {}

  @Post()
  @ApiOperation({ summary: 'Place an order (runs the reserve-inventory -> charge-payment saga)' })
  create(@Body() dto: CreateOrderDto) {
    return firstValueFrom(this.ordersClient.send(ORDERS_PATTERNS.CREATE, dto));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch an order by id' })
  async findOne(@Param('id') id: string) {
    const order = await firstValueFrom(this.ordersClient.send(ORDERS_PATTERNS.FIND_ONE, { id }));
    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    return order;
  }
}
