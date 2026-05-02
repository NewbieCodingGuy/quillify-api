import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Response } from 'express';

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    response.status(HttpStatus.TOO_MANY_REQUESTS).json({
      statusCode: 429,
      error: 'Too Many Requests',
      message: exception.message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
