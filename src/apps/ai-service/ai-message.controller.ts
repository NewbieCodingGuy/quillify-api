import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AiService } from '../../modules/ai/ai.service';
import {
  GenerateDto,
  ImproveDto,
  SummarizeDto,
  ChatDto,
} from '../../modules/ai/dto/generate.dto';
import { EventPattern } from '@nestjs/microservices';

@Controller()
export class AiMessageController {
  constructor(private readonly aiService: AiService) {}

  @MessagePattern('ai.generate')
  async generate(@Payload() data: { dto: GenerateDto; userId: number }) {
    return this.aiService.generateText(data.dto, data.userId);
  }

  @MessagePattern('ai.improve')
  async improve(@Payload() data: { dto: ImproveDto; userId: number }) {
    return this.aiService.improveText(data.dto, data.userId);
  }

  @MessagePattern('ai.summarize')
  async summarize(@Payload() data: { dto: SummarizeDto; userId: number }) {
    return this.aiService.summarizeText(data.dto, data.userId);
  }

  @MessagePattern('ai.chat')
  async chat(@Payload() data: { dto: ChatDto; userId: number }) {
    return this.aiService.chat(data.dto, data.userId);
  }

  @MessagePattern('ai.sessions')
  async getSessions(@Payload() data: { userId: number }) {
    return this.aiService.getUserSessions(data.userId);
  }

  @MessagePattern('ai.chat.history')
  async getChatHistory(@Payload() data: { sessionId: number; userId: number }) {
    return this.aiService.getChatHistory(data.sessionId, data.userId);
  }

  // This fires when main app emits 'ai.completed' event
  @EventPattern('ai.completed')
  async handleAiCompleted(
    @Payload() data: { userId: number; action: string; tokens: number },
  ) {
    // Log analytics async — doesn't block the response
    console.log(`AI completed: user=${data.userId} tokens=${data.tokens}`);
  }
}
