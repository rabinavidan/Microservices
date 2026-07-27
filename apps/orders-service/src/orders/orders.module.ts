import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SERVICE_NAMES } from '@app/common';
import { Order } from './entities/order.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    ClientsModule.registerAsync([
      {
        name: SERVICE_NAMES.INVENTORY,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP as const,
          options: {
            host: config.get<string>('INVENTORY_HOST', 'localhost'),
            port: Number(config.get('INVENTORY_TCP_PORT', 4003)),
          },
        }),
      },
      {
        name: SERVICE_NAMES.PAYMENTS,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP as const,
          options: {
            host: config.get<string>('PAYMENTS_HOST', 'localhost'),
            port: Number(config.get('PAYMENTS_TCP_PORT', 4002)),
          },
        }),
      },
      {
        name: SERVICE_NAMES.NOTIFICATIONS,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP as const,
          options: {
            host: config.get<string>('NOTIFICATIONS_HOST', 'localhost'),
            port: Number(config.get('NOTIFICATIONS_TCP_PORT', 4004)),
          },
        }),
      },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
