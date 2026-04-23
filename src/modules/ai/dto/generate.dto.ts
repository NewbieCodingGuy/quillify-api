import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
} from 'class-validator';

export enum ToneOption {
  PROFESSIONAL = 'professional',
  CASUAL = 'casual',
  FORMAL = 'formal',
  CREATIVE = 'creative',
}

export class GenerateDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Prompt must be at least 10 characters' })
  @MaxLength(2000, { message: 'Prompt must not exceed 2000 characters' })
  prompt: string;

  @IsOptional()
  @IsEnum(ToneOption)
  tone?: ToneOption; // field may or may not be present

  @IsOptional()
  @MaxLength(500)
  context?: string;
}

export class ImproveDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(20, { message: 'Text must be at least 20 characters' })
  @MaxLength(5000)
  text: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  instructions?: string;
}

export class SummarizeDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(100, {
    message: 'Text must be at least 100 characters to summarize',
  })
  @MaxLength(10000)
  text: string;

  @IsOptional()
  @MaxLength(200)
  focusOn?: string;
}

export class ChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @IsOptional()
  sessionId?: number;
}
