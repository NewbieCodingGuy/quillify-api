import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const AI_SERVICE = 'AI_SERVICE';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: AI_SERVICE,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.REDIS,
          options: {
            host: config.get('REDIS_HOST'),
            port: config.get('REDIS_PORT'),
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class AiClientModule {}
