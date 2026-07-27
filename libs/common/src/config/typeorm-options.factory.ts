import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

/**
 * Builds per-service TypeORM options from env vars. Each service owns its
 * own `DB_NAME` (database-per-service) even though, for local/demo
 * purposes, they all point at the same Postgres instance.
 */
export function buildTypeOrmOptions(
  config: ConfigService,
  entities: TypeOrmModuleOptions['entities'],
): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: config.get<string>('POSTGRES_HOST', 'localhost'),
    port: config.get<number>('POSTGRES_PORT', 5432),
    username: config.get<string>('POSTGRES_USER', 'postgres'),
    password: config.get<string>('POSTGRES_PASSWORD', 'postgres'),
    database: config.get<string>('DB_NAME'),
    entities,
    synchronize: config.get<string>('NODE_ENV', 'development') !== 'production',
    autoLoadEntities: true,
  };
}
