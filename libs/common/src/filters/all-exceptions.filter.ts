import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';

/**
 * Normalizes both HTTP and RPC (microservice) exceptions into a single
 * shape. Registered with APP_FILTER in HTTP apps (returns an Express
 * response) and with app.useGlobalFilters in hybrid/microservice contexts
 * (returns an Observable so the RPC transport can propagate the error
 * back to the calling service).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void | Observable<never> {
    const contextType = host.getType();

    const { status, message } = this.resolve(exception);

    if (contextType === 'rpc') {
      this.logger.error(`RPC error: ${message}`);
      return throwError(() => ({ success: false, error: message }));
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
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

  private resolve(exception: unknown): { status: number; message: string } {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : ((response as { message?: string }).message ?? exception.message);
      return {
        status: exception.getStatus(),
        message: Array.isArray(message) ? message.join(', ') : message,
      };
    }

    if (exception instanceof RpcException) {
      return { status: HttpStatus.BAD_GATEWAY, message: String(exception.getError()) };
    }

    if (exception instanceof Error) {
      return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: exception.message };
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Unexpected error' };
  }
}
