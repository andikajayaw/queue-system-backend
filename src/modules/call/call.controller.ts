import {
  Controller,
  Post,
  Param,
  Patch,
  Get,
  UseGuards,
  Body,
} from '@nestjs/common';
import { CallService } from './call.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('call')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CallController {
  constructor(private readonly callService: CallService) {}

  @Post('queue/:id')
  @Roles(Role.ADMIN, Role.STAFF)
  async callQueue(@Param('id') id: string, @Body() body: { staffId: string }) {
    return this.callService.callQueue(id, body.staffId);
  }

  @Post('next')
  @Roles(Role.ADMIN, Role.STAFF)
  async callNextQueue(@Body() body: { staffId: string }) {
    return this.callService.callNextQueue(body.staffId);
  }

  @Post('number/:queueNumber')
  @Roles(Role.ADMIN, Role.STAFF)
  async callQueueByNumber(
    @Param('queueNumber') queueNumber: string,
    @Body() body: { staffId: string },
  ) {
    return this.callService.callQueueByNumber(queueNumber, body.staffId);
  }

  @Post('recall/:id')
  @Roles(Role.ADMIN, Role.STAFF)
  async recallQueue(@Param('id') id: string) {
    return this.callService.recallQueue(id);
  }

  @Patch('serving/:id')
  @Roles(Role.ADMIN, Role.STAFF)
  async markAsServing(
    @Param('id') id: string,
    @Body() body: { staffId: string },
  ) {
    return this.callService.markAsServing(id, body.staffId);
  }

  @Patch('completed/:id')
  @Roles(Role.ADMIN, Role.STAFF)
  async markAsCompleted(@Param('id') id: string) {
    return this.callService.markAsCompleted(id);
  }

  @Patch('skip/:id')
  @Roles(Role.ADMIN, Role.STAFF)
  async skipQueue(@Param('id') id: string, @Body() body: { staffId: string }) {
    return this.callService.skipQueue(id, body.staffId);
  }

  @Get('current')
  @Roles(Role.ADMIN, Role.STAFF)
  async getCurrentCalls() {
    return this.callService.getCurrentCalls();
  }
}
