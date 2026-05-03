import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Global prefix — all routes start with /api/v1
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  //Global Exception Filters
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalFilters(new ThrottlerExceptionFilter());

  //Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  const port = config.get<number>('PORT') || 3000;
  await app.listen(port);

  logger.log(`Application running on port ${port}`);
  logger.log(`Environment: ${config.get('NODE_ENV')}`);
  logger.log(`GraphQL playground: http://localhost:${port}/graphql`);
}

bootstrap();
