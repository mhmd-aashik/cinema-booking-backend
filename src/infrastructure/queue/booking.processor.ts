import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from 'src/database/database.constants';
import type { Database } from 'src/database/database.types';
import { bookings, bookingSeats, users } from 'src/database/schema';
import { MailService } from '../mail/mail.service';
import { RedisService } from '../redis/redis.service';
import QRCode from 'qrcode';

@Processor('booking')
export class BookingProcessor extends WorkerHost {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,

    private readonly redisService: RedisService,

    private readonly mailService: MailService,
  ) {
    super();
  }

  async process(job: Job<{ bookingId: string }>) {
    if (job.name === 'expire-booking') {
      return this.expireBooking(job.data.bookingId);
    }

    if (job.name === 'send-confirmation-email') {
      return this.sendConfirmationEmail(job.data.bookingId);
    }
  }

  private async expireBooking(bookingId: string) {
    const [booking] = await this.db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking || booking.status !== 'PENDING') {
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

    const selectedSeats = await this.db
      .select({
        showSeatId: bookingSeats.showSeatId,
      })
      .from(bookingSeats)
      .where(eq(bookingSeats.bookingId, booking.id));

    const showSeatIds = selectedSeats.map((seat) => seat.showSeatId);

    await this.redisService.releaseSeats(showSeatIds);
  }

  private async generateTicketQr(bookingId: string, bookingReference: string) {
    return QRCode.toBuffer(
      JSON.stringify({
        bookingId,
        bookingReference,
      }),
    );
  }

  private async sendConfirmationEmail(bookingId: string) {
    const [booking] = await this.db
      .select({
        bookingReference: bookings.bookingReference,
        email: users.email,
      })
      .from(bookings)
      .innerJoin(users, eq(users.id, bookings.userId))
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking) {
      return;
    }

    const qrBuffer = await this.generateTicketQr(
      bookingId,
      booking.bookingReference,
    );

    await this.mailService.sendBookingConfirmation(
      booking.email,
      booking.bookingReference,
      qrBuffer,
    );
  }
}
