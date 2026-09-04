import { Processor, WorkerHost } from '@nestjs/bullmq';
import { eq } from 'drizzle-orm';
import type { Job } from 'bullmq';

import { Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from 'src/database/database.constants';
import type { Database } from 'src/database/database.types';
import { bookings, bookingSeats } from 'src/database/schema';
import { RedisService } from '../redis/redis.service';
import QRCode from 'qrcode';

@Processor('booking')
export class BookingProcessor extends WorkerHost {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,

    private readonly redisService: RedisService,
  ) {
    super();
  }

  async process(job: Job<{ bookingId: string }>) {
    if (job.name !== 'expire-booking') {
      return;
    }

    // 1. Find booking
    const [booking] = await this.db
      .select()
      .from(bookings)
      .where(eq(bookings.id, job.data.bookingId))
      .limit(1);

    if (!booking) {
      return;
    }

    // 2. Don't cancel already confirmed booking
    if (booking.status !== 'PENDING') {
      return;
    }

    // 3. Cancel expired booking
    await this.db
      .update(bookings)
      .set({
        status: 'CANCELLED',
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, booking.id));

    // 4. Find seats belonging to this booking
    const selectedSeats = await this.db
      .select({
        showSeatId: bookingSeats.showSeatId,
      })
      .from(bookingSeats)
      .where(eq(bookingSeats.bookingId, booking.id));

    const showSeatIds = selectedSeats.map((seat) => seat.showSeatId);

    // 5. Remove temporary Redis holds
    await this.redisService.releaseSeats(showSeatIds);
  }

  private async generateTicketQr(bookingId: string) {
    const qrData = JSON.stringify({
      bookingId,
    });

    const qrImage = await QRCode.toDataURL(qrData);

    console.log('QR generated:', bookingId);

    return qrImage;
  }
}
