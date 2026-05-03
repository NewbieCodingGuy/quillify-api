import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';

import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Gateway');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const requestId = request['requestId'] || 'unknown';
    const userId = request.user?.userId || 'anonymous';
    const startTime = Date.now();

    this.logger.log(
      `[${requestId}] -> ${method} ${url} | user:${userId} | ip:${ip}`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.log(
            `[${requestId}] ← ${method} ${url} | ${duration}ms | user:${userId}`,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `[${requestId}] ✗ ${method} ${url} | ${duration}ms | ${error.status || 500} | user:${userId}`,
          );
        },
      }),
    );
  }
}
