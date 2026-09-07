import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from 'src/database/database.constants';
import type { Database } from 'src/database/database.types';
import {
  bookings,
  bookingSeats,
  users,
  shows,
  movies,
  screens,
  cinemas,
  showSeats,
  seats,
} from 'src/database/schema';
import { MailService, type TicketSeat } from '../mail/mail.service';
import { RedisService } from '../redis/redis.service';
import { SeatsGateway } from 'src/seats/seats.gateway';
import QRCode from 'qrcode';

@Processor('booking')
export class BookingProcessor extends WorkerHost {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,

    private readonly redisService: RedisService,

    private readonly mailService: MailService,

    private readonly seatsGateway: SeatsGateway,
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

    if (showSeatIds.length > 0) {
      this.seatsGateway.notifySeatsReleased(booking.showId, showSeatIds);
    }
  }

  private async generateSeatQr(
    bookingId: string,
    bookingReference: string,
    bookingSeatId: string,
    rowLabel: string,
    seatNumber: number,
  ) {
    return QRCode.toBuffer(
      JSON.stringify({
        bookingId,
        bookingReference,
        bookingSeatId,
        seat: `${rowLabel}${seatNumber}`,
      }),
    );
  }

  private async sendConfirmationEmail(bookingId: string) {
    const [booking] = await this.db
      .select({
        bookingReference: bookings.bookingReference,
        email: users.email,
        movieTitle: movies.title,
        cinemaName: cinemas.name,
        screenName: screens.name,
        showStartsAt: shows.startsAt,
      })
      .from(bookings)
      .innerJoin(users, eq(users.id, bookings.userId))
      .innerJoin(shows, eq(shows.id, bookings.showId))
      .innerJoin(movies, eq(movies.id, shows.movieId))
      .innerJoin(screens, eq(screens.id, shows.screenId))
      .innerJoin(cinemas, eq(cinemas.id, screens.cinemaId))
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking) {
      return;
    }

    const seatRows = await this.db
      .select({
        bookingSeatId: bookingSeats.id,
        rowLabel: seats.rowLabel,
        seatNumber: seats.seatNumber,
        seatType: seats.seatType,
      })
      .from(bookingSeats)
      .innerJoin(showSeats, eq(showSeats.id, bookingSeats.showSeatId))
      .innerJoin(seats, eq(seats.id, showSeats.seatId))
      .where(eq(bookingSeats.bookingId, bookingId));

    const ticketSeats: TicketSeat[] = await Promise.all(
      seatRows.map(async (seat) => ({
        rowLabel: seat.rowLabel,
        seatNumber: seat.seatNumber,
        seatType: seat.seatType,
        qrBuffer: await this.generateSeatQr(
          bookingId,
          booking.bookingReference,
          seat.bookingSeatId,
          seat.rowLabel,
          seat.seatNumber,
        ),
      })),
    );

    await this.mailService.sendBookingConfirmation({
      to: booking.email,
      bookingReference: booking.bookingReference,
      movieTitle: booking.movieTitle,
      cinemaName: booking.cinemaName,
      screenName: booking.screenName,
      showStartsAt: booking.showStartsAt,
      seats: ticketSeats,
    });
  }
}
