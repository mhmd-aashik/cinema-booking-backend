import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BookingProcessor } from './booking.processor';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),

    BullModule.registerQueue({
      name: 'booking',
    }),
  ],

  providers: [BookingProcessor],

  exports: [BullModule],
})
export class QueueModule {}
