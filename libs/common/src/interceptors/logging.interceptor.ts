import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuid } from 'uuid';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Attaches (or propagates) a correlation id to every inbound HTTP request
 * and logs method/path/status/duration. In a real deployment this id
 * would also be forwarded on outbound ClientProxy calls and included in
 * every downstream log line so a single request can be traced across
 * service boundaries.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const correlationId = (request.headers[CORRELATION_ID_HEADER] as string) ?? uuid();
    request.headers[CORRELATION_ID_HEADER] = correlationId;
    response.setHeader(CORRELATION_ID_HEADER, correlationId);

    const start = Date.now();
    const { method, originalUrl } = request;

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            `[${correlationId}] ${method} ${originalUrl} ${response.statusCode} +${Date.now() - start}ms`,
          );
        },
        error: (err: Error) => {
          this.logger.error(
            `[${correlationId}] ${method} ${originalUrl} FAILED +${Date.now() - start}ms: ${err.message}`,
          );
        },
      }),
    );
  }
}
