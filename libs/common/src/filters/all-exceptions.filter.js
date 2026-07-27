"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AllExceptionsFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const rxjs_1 = require("rxjs");
let AllExceptionsFilter = AllExceptionsFilter_1 = class AllExceptionsFilter {
    constructor() {
        this.logger = new common_1.Logger(AllExceptionsFilter_1.name);
    }
    catch(exception, host) {
        const contextType = host.getType();
        const { status, message } = this.resolve(exception);
        if (contextType === 'rpc') {
            this.logger.error(`RPC error: ${message}`);
            return (0, rxjs_1.throwError)(() => ({ success: false, error: message }));
        }
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const correlationId = request?.headers?.['x-correlation-id'] ?? 'n/a';
        this.logger.error(`[${correlationId}] ${request?.method} ${request?.url} -> ${message}`);
        response.status(status).json({
            statusCode: status,
            message,
            path: request?.url,
            correlationId,
            timestamp: new Date().toISOString(),
        });
    }
    resolve(exception) {
        if (exception instanceof common_1.HttpException) {
            const response = exception.getResponse();
            const message = typeof response === 'string'
                ? response
                : (response.message ?? exception.message);
            return { status: exception.getStatus(), message: Array.isArray(message) ? message.join(', ') : message };
        }
        if (exception instanceof microservices_1.RpcException) {
            return { status: common_1.HttpStatus.BAD_GATEWAY, message: String(exception.getError()) };
        }
        if (exception instanceof Error) {
            return { status: common_1.HttpStatus.INTERNAL_SERVER_ERROR, message: exception.message };
        }
        return { status: common_1.HttpStatus.INTERNAL_SERVER_ERROR, message: 'Unexpected error' };
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = AllExceptionsFilter_1 = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=all-exceptions.filter.js.map