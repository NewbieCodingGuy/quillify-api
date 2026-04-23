import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatSession, ChatMessage, MessageRole } from './entities/chat.entity';
import {
  GenerateDto,
  ImproveDto,
  SummarizeDto,
  ChatDto,
  ToneOption,
} from './dto/generate.dto';

@Injectable()
export class AiService {
  private readonly openai: OpenAI;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly logger = new Logger(AiService.name);

  constructor(
    @InjectRepository(ChatSession)
    private readonly chatRepository: Repository<ChatSession>,
    private readonly configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });
    this.model = this.configService.get('OPENAI_MODEL') || 'gpt-4o-mini';
    this.maxTokens =
      Number(this.configService.get('OPENAI_MAX_TOKENS')) || 1000;
  }

  async generateText(dto: GenerateDto, userId: number) {
    const toneInstruction = dto.tone
      ? `Write in a ${dto.tone} tone.`
      : 'Write in a professional tone.';

    const systemPrompt = `You are a helpful writing assistant.
${toneInstruction}
Provide high quality, well-structured content.
${dto.context ? `Context: ${dto.context}` : ''}`;

    const response = await this.openai.chat.completions.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: dto.prompt },
      ],
    });

    const content = response.choices[0].message.content;

    this.logger.log(`Generated text for user ${userId}`);

    return {
      content,
      usage: {
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
      },
    };
  }

  async improveText(dto: ImproveDto, userId: number) {
    const systemPrompt = `You are an expert editor and writing coach.
Improve the provided text while preserving the original meaning.
${dto.instructions ? `Specific instructions: ${dto.instructions}` : ''}
Focus on clarity, grammar, style, and flow.
Return only the improved text without explanations.`;

    const response = await this.openai.chat.completions.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Improve this text:\n\n${dto.text}` },
      ],
    });

    return {
      original: dto.text,
      improved: response.choices[0].message.content,
      usage: {
        totalTokens: response.usage?.total_tokens,
      },
    };
  }

  async summarizeText(dto: SummarizeDto, userId: number) {
    const systemPrompt = `You are an expert at creating concise, accurate summaries.
Capture the key points and main ideas.
${dto.focusOn ? `Focus particularly on: ${dto.focusOn}` : ''}
Return a well-structured summary.`;

    const response = await this.openai.chat.completions.create({
      model: this.model,
      max_tokens: Math.floor(this.maxTokens / 2), // summaries should be shorter
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Summarize this text:\n\n${dto.text}` },
      ],
    });

    return {
      summary: response.choices[0].message.content,
      originalLength: dto.text.length,
      summaryLength: response.choices[0].message.content?.length,
      usage: {
        totalTokens: response.usage?.total_tokens,
      },
    };
  }

  async chat(dto: ChatDto, userId: number) {
    let session: ChatSession;

    if (dto.sessionId) {
      // Continue existing session
      const existingSession = await this.chatRepository.findOne({
        where: { id: dto.sessionId, userId },
      });

      if (existingSession) {
        session = existingSession;
      } else {
        session = await this.createNewSession(userId);
      }
    } else {
      // Create new session
      session = await this.createNewSession(userId);
    }

    // Add user message
    const userMessage: ChatMessage = {
      role: MessageRole.USER,
      content: dto.message,
      timestamp: new Date().toISOString(),
    };
    session.messages.push(userMessage);

    // Build messages for OpenAI (last 10 for context window management)
    const recentMessages = session.messages.slice(-10);
    const openAiMessages = recentMessages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    const response = await this.openai.chat.completions.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful writing assistant. Be concise and helpful.',
        },
        ...openAiMessages,
      ],
    });

    const assistantContent = response.choices[0].message.content || '';

    // Add assistant response to session
    const assistantMessage: ChatMessage = {
      role: MessageRole.ASSISTANT,
      content: assistantContent,
      timestamp: new Date().toISOString(),
    };
    session.messages.push(assistantMessage);

    // Update session title from first message
    if (session.messages.length <= 2) {
      session.title = dto.message.slice(0, 50);
    }

    await this.chatRepository.save(session);

    return {
      sessionId: session.id,
      message: assistantContent,
      usage: {
        totalTokens: response.usage?.total_tokens,
      },
    };
  }

  async getChatHistory(sessionId: number, userId: number) {
    const session = await this.chatRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) return null;

    return {
      id: session.id,
      title: session.title,
      messages: session.messages,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  async getUserSessions(userId: number) {
    return this.chatRepository.find({
      where: { userId },
      select: ['id', 'title', 'createdAt', 'updatedAt'],
      order: { updatedAt: 'DESC' },
      take: 20,
    });
  }

  private async createNewSession(userId: number): Promise<ChatSession> {
    const session = this.chatRepository.create({
      userId,
      messages: [],
      title: 'New Chat',
    });
    return this.chatRepository.save(session);
  }
}
