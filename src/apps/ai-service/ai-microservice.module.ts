import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiMessageController } from './ai-message.controller';
import { AiService } from '../../modules/ai/ai.service';
import { ChatSession } from '../../modules/ai/entities/chat.entity';
import { User } from '../../modules/auth/entities/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [ChatSession, User],
      synchronize: false,
    }),
    TypeOrmModule.forFeature([ChatSession]),
  ],
  controllers: [AiMessageController],
  providers: [AiService],
})
export class AiMicroserviceModule {}
