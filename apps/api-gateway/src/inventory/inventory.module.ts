import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SERVICE_NAMES } from '@app/common';
import { InventoryController } from './inventory.controller';

@Module({
  imports: [
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
    ]),
  ],
  controllers: [InventoryController],
})
export class InventoryModule {}
