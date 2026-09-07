import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { QueueModule } from 'src/infrastructure/queue/queue.module';
import { SeatsModule } from 'src/seats/seats.module';

@Module({
  imports: [QueueModule, SeatsModule],
  providers: [BookingsService],
  controllers: [BookingsController],
})
export class BookingsModule {}
