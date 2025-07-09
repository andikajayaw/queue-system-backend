import { PartialType } from '@nestjs/mapped-types';
import { CreateQueueDto } from './create-queue.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { QueueStatus } from '@prisma/client';

export class UpdateQueueDto extends PartialType(CreateQueueDto) {
  @IsEnum(QueueStatus)
  @IsOptional()
  status?: QueueStatus;
}
