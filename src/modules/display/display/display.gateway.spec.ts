import { Test, TestingModule } from '@nestjs/testing';
import { DisplayGateway } from './display.gateway';

describe('DisplayGateway', () => {
  let gateway: DisplayGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DisplayGateway],
    }).compile();

    gateway = module.get<DisplayGateway>(DisplayGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
