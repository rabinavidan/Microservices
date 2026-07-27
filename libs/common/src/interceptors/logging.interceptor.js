"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingInterceptor = exports.CORRELATION_ID_HEADER = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const uuid_1 = require("uuid");
exports.CORRELATION_ID_HEADER = 'x-correlation-id';
let LoggingInterceptor = class LoggingInterceptor {
    constructor() {
        this.logger = new common_1.Logger('HTTP');
    }
    intercept(context, next) {
        if (context.getType() !== 'http') {
            return next.handle();
        }
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const correlationId = request.headers[exports.CORRELATION_ID_HEADER] ?? (0, uuid_1.v4)();
        request.headers[exports.CORRELATION_ID_HEADER] = correlationId;
        response.setHeader(exports.CORRELATION_ID_HEADER, correlationId);
        const start = Date.now();
        const { method, originalUrl } = request;
        return next.handle().pipe((0, operators_1.tap)({
            next: () => {
                this.logger.log(`[${correlationId}] ${method} ${originalUrl} ${response.statusCode} +${Date.now() - start}ms`);
            },
            error: (err) => {
                this.logger.error(`[${correlationId}] ${method} ${originalUrl} FAILED +${Date.now() - start}ms: ${err.message}`);
            },
        }));
    }
};
exports.LoggingInterceptor = LoggingInterceptor;
exports.LoggingInterceptor = LoggingInterceptor = __decorate([
    (0, common_1.Injectable)()
], LoggingInterceptor);
//# sourceMappingURL=logging.interceptor.js.map