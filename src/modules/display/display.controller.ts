import { Controller, Get, Query } from '@nestjs/common';
import { DisplayService } from './display.service';

@Controller('display')
export class DisplayController {
  constructor(private readonly displayService: DisplayService) {}

  @Get('current-called')
  async getCurrentCalledQueues() {
    return this.displayService.getCurrentCalledQueues();
  }

  @Get('statistics')
  async getQueueStatistics() {
    return this.displayService.getQueueStatistics();
  }

  @Get('recent-completed')
  async getRecentCompletedQueues(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.displayService.getRecentCompletedQueues(limitNum);
  }

  @Get('next-waiting')
  async getNextWaitingQueues(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    return this.displayService.getNextWaitingQueues(limitNum);
  }
}
