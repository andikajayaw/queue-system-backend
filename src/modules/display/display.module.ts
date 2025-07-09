import { Module } from '@nestjs/common';
import { DisplayController } from './display.controller';
import { DisplayService } from './display.service';
import { DisplayGateway } from './display/display.gateway';

@Module({
  controllers: [DisplayController],
  providers: [DisplayService, DisplayGateway],
  exports: [DisplayService, DisplayGateway],
})
export class DisplayModule {}