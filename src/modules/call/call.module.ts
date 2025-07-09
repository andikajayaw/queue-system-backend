import { Module } from '@nestjs/common';
import { CallController } from './call.controller';
import { CallService } from './call.service';
import { CallGateway } from './call/call.gateway';
import { QueueModule } from '../queue/queue.module';
import { PrismaService } from '../../../prisma/prisma.service';
import { DisplayModule } from '../display/display.module'; // Import DisplayModule

@Module({
  imports: [QueueModule, DisplayModule],
  controllers: [CallController],
  providers: [CallService, CallGateway, PrismaService],
  exports: [CallService, CallGateway],
})
export class CallModule {}
