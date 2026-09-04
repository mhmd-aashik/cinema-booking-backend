import { Test, TestingModule } from '@nestjs/testing';
import { SeatsGateway } from './seats.gateway';

describe('SeatsGateway', () => {
  let gateway: SeatsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SeatsGateway],
    }).compile();

    gateway = module.get<SeatsGateway>(SeatsGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
