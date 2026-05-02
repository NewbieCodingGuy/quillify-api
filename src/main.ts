import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global prefix — all routes start with /api/v1
  app.setGlobalPrefix('api/v1');

  app.useGlobalFilters(new ThrottlerExceptionFilter());

  const port = config.get<number>('PORT') || 3000;
  await app.listen(port);

  logger.log(`Application running on port ${port}`);
  logger.log(`Environment: ${config.get('NODE_ENV')}`);
}

bootstrap();
