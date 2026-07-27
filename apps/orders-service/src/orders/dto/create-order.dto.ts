import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsInt, IsNumber, IsString, Min, ValidateNested } from 'class-validator';
import { OrderItem } from '@app/common';

export class OrderItemDto implements OrderItem {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateOrderDto {
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
