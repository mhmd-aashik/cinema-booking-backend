import { Module } from '@nestjs/common';
import { SeatsService } from './seats.service';
import { SeatsController } from './seats.controller';

@Module({
  providers: [SeatsService],
  controllers: [SeatsController]
})
export class SeatsModule {}
