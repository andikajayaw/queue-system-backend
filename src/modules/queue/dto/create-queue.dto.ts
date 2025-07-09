import { IsEnum, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { QueueType } from '@prisma/client';

export class CreateQueueDto {
  @IsEnum(QueueType)
  @IsNotEmpty()
  type: QueueType;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;
}
