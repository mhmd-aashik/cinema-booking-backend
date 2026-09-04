import { Processor, WorkerHost } from '@nestjs/bullmq';
import { eq } from 'drizzle-orm';
import type { Job } from 'bullmq';

import { Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from 'src/database/database.constants';
import type { Database } from 'src/database/database.types';
import { bookings } from 'src/database/schema';

@Processor('booking')
export class BookingProcessor extends WorkerHost {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {
    super();
  }

  async process(job: Job<{ bookingId: string }>) {
    if (job.name !== 'expire-booking') {
      return;
    }

    const [booking] = await this.db
      .select()
      .from(bookings)
      .where(eq(bookings.id, job.data.bookingId))
      .limit(1);

    if (!booking) {
      return;
    }

    // Payment may already have confirmed the booking.
    if (booking.status !== 'PENDING') {
      return;
    }

    await this.db
      .update(bookings)
      .set({
        status: 'CANCELLED',
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, booking.id));
  }
}
