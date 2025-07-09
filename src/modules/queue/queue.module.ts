// src/queue/queue.module.ts
import { Module } from '@nestjs/common';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { DisplayModule } from '../display/display.module'; // Import DisplayModule

@Module({
  imports: [DisplayModule],
  controllers: [QueueController],
  providers: [QueueService, PrismaService],
  exports: [QueueService],
})
export class QueueModule {}
