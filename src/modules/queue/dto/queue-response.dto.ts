// src/queue/dto/queue-response.dto.ts
import { QueueType, QueueStatus } from '@prisma/client';

export class QueueResponseDto {
  id: string;
  queueNumber: string;
  type: QueueType;
  status: QueueStatus;
  customerName?: string | null;
  phoneNumber?: string | null;
  createdAt: Date;
  updatedAt: Date;
  calledAt?: Date | null;
  completedAt?: Date | null;
}
