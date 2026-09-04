import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { QueueModule } from 'src/infrastructure/queue/queue.module';

@Module({
  imports: [QueueModule],
  providers: [BookingsService],
  controllers: [BookingsController],
})
export class BookingsModule {}
