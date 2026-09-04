import { Module } from '@nestjs/common';
import { SeatsService } from './seats.service';
import { SeatsController } from './seats.controller';
import { SeatsGateway } from './seats.gateway';

@Module({
  providers: [SeatsService, SeatsGateway],
  controllers: [SeatsController]
})
export class SeatsModule {}
