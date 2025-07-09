import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { QueueService } from './queue.service';
import { CreateQueueDto } from './dto/create-queue.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, QueueStatus, QueueType } from '@prisma/client';

@Controller('queue')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post()
  @Roles(Role.ADMIN, Role.STAFF)
  create(@Body() createQueueDto: CreateQueueDto) {
    return this.queueService.createQueue(createQueueDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.STAFF)
  findAll(
    @Query('status') status?: QueueStatus,
    @Query('type') type?: QueueType,
  ) {
    return this.queueService.findAll(status, type);
  }

  @Get('stats')
  @Roles(Role.ADMIN, Role.STAFF)
  getStats() {
    return this.queueService.getQueueStats();
  }

  @Get('dashboard-stats')
  @Roles(Role.ADMIN, Role.STAFF)
  getDashboardStats() {
    return this.queueService.getDashboardStats();
  }

  @Get('today')
  @Roles(Role.ADMIN, Role.STAFF)
  getTodayQueues() {
    return this.queueService.getTodayQueues();
  }

  @Get('next-priority')
  @Roles(Role.ADMIN, Role.STAFF)
  getNextQueueByPriority() {
    return this.queueService.getNextQueueByPriority();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.STAFF)
  findOne(@Param('id') id: string) {
    return this.queueService.findOne(id);
  }

  @Get('number/:queueNumber')
  @Roles(Role.ADMIN, Role.STAFF)
  findByQueueNumber(@Param('queueNumber') queueNumber: string) {
    return this.queueService.findByQueueNumber(queueNumber);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.STAFF)
  update(@Param('id') id: string, @Body() updateQueueDto: UpdateQueueDto) {
    return this.queueService.updateQueue(id, updateQueueDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.STAFF)
  remove(@Param('id') id: string) {
    return this.queueService.deleteQueue(id);
  }
}
