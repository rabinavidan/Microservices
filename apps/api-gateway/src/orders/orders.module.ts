import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SERVICE_NAMES } from '@app/common';
import { OrdersController } from './orders.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: SERVICE_NAMES.ORDERS,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP as const,
          options: {
            host: config.get<string>('ORDERS_HOST', 'localhost'),
            port: Number(config.get('ORDERS_TCP_PORT', 4001)),
          },
        }),
      },
    ]),
  ],
  controllers: [OrdersController],
})
export class OrdersModule {}
