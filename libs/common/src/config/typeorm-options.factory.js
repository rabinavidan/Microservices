"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTypeOrmOptions = buildTypeOrmOptions;
function buildTypeOrmOptions(config, entities) {
    return {
        type: 'postgres',
        host: config.get('POSTGRES_HOST', 'localhost'),
        port: config.get('POSTGRES_PORT', 5432),
        username: config.get('POSTGRES_USER', 'postgres'),
        password: config.get('POSTGRES_PASSWORD', 'postgres'),
        database: config.get('DB_NAME'),
        entities,
        synchronize: config.get('NODE_ENV', 'development') !== 'production',
        autoLoadEntities: true,
    };
}
//# sourceMappingURL=typeorm-options.factory.js.map