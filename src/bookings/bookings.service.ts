import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { DATABASE_CONNECTION } from 'src/database/database.constants';
import type { Database } from 'src/database/database.types';
import {
  users,
  shows,
  movies,
  screens,
  cinemas,
  bookings,
  bookingSeats,
  showSeats,
  seats,
  payments,
} from 'src/database/schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SeatsGateway } from 'src/seats/seats.gateway';

@Injectable()
export class BookingsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,

    private readonly redisService: RedisService,

    private readonly seatsGateway: SeatsGateway,

    @InjectQueue('booking')
    private readonly bookingQueue: Queue,
  ) {}

  async create(userId: string, dto: CreateBookingDto) {
    const [user] = await this.db
      .select({
        id: users.id,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [show] = await this.db
      .select({
        id: shows.id,
      })
      .from(shows)
      .where(eq(shows.id, dto.showId))
      .limit(1);

    if (!show) {
      throw new NotFoundException('Show not found');
    }

    const bookingReference = `BK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const [booking] = await this.db
      .insert(bookings)
      .values({
        userId,
        showId: dto.showId,
        bookingReference,
        totalAmount: '0.00',
        expiresAt,
      })
      .returning();

    await this.bookingQueue.add(
      'expire-booking',
      {
        bookingId: booking.id,
      },
      {
        delay: 5 * 60 * 1000,
      },
    );

    return booking;
  }

  async addSeats(bookingId: string, userId: string, showSeatIds: string[]) {
    const [booking] = await this.db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('This booking does not belong to you');
    }

    if (booking.status !== 'PENDING') {
      throw new BadRequestException('Only pending bookings can be modified');
    }

    if (booking.expiresAt && booking.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Booking has expired');
    }

    const selectedShowSeats = await this.db
      .select()
      .from(showSeats)
      .where(
        and(
          eq(showSeats.showId, booking.showId),
          inArray(showSeats.id, showSeatIds),
        ),
      );

    if (selectedShowSeats.length !== showSeatIds.length) {
      throw new BadRequestException(
        'One or more seats are invalid for this show',
      );
    }

    const unavailableSeat = selectedShowSeats.find(
      (seat) => seat.status !== 'AVAILABLE',
    );

    if (unavailableSeat) {
      throw new BadRequestException('One or more seats are unavailable');
    }

    await this.redisService.holdSeats(showSeatIds, booking.userId, booking.id);

    const totalAmount = selectedShowSeats.reduce(
      (total, seat) => total + Number(seat.price),
      0,
    );

    const result = await this.db.transaction(async (tx) => {
      const rows: (typeof bookingSeats.$inferInsert)[] = selectedShowSeats.map(
        (seat) => ({
          bookingId: booking.id,
          showSeatId: seat.id,
          price: seat.price,
        }),
      );

      const insertedSeats = await tx
        .insert(bookingSeats)
        .values(rows)
        .returning();

      const [updatedBooking] = await tx
        .update(bookings)
        .set({
          totalAmount: totalAmount.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, booking.id))
        .returning();

      return {
        booking: updatedBooking,
        seats: insertedSeats,
      };
    });

    this.seatsGateway.notifySeatsHeld(booking.showId, showSeatIds);

    return result;
  }

  async findAllForUser(userId: string) {
    const rows = await this.db
      .select({
        id: bookings.id,
        bookingReference: bookings.bookingReference,
        status: bookings.status,
        totalAmount: bookings.totalAmount,
        currency: bookings.currency,
        expiresAt: bookings.expiresAt,
        confirmedAt: bookings.confirmedAt,
        createdAt: bookings.createdAt,
        showStartsAt: shows.startsAt,
        movieTitle: movies.title,
        moviePosterUrl: movies.posterUrl,
        cinemaName: cinemas.name,
        screenName: screens.name,
      })
      .from(bookings)
      .innerJoin(shows, eq(shows.id, bookings.showId))
      .innerJoin(movies, eq(movies.id, shows.movieId))
      .innerJoin(screens, eq(screens.id, shows.screenId))
      .innerJoin(cinemas, eq(cinemas.id, screens.cinemaId))
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt));

    return rows;
  }

  async findOneForUser(bookingId: string, userId: string, role: string) {
    const [row] = await this.db
      .select({
        booking: bookings,
        show: shows,
        movie: movies,
        screen: screens,
        cinema: cinemas,
      })
      .from(bookings)
      .innerJoin(shows, eq(shows.id, bookings.showId))
      .innerJoin(movies, eq(movies.id, shows.movieId))
      .innerJoin(screens, eq(screens.id, shows.screenId))
      .innerJoin(cinemas, eq(cinemas.id, screens.cinemaId))
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!row) {
      throw new NotFoundException('Booking not found');
    }

    if (row.booking.userId !== userId && role !== 'ADMIN') {
      throw new ForbiddenException('This booking does not belong to you');
    }

    const seatRows = await this.db
      .select({
        id: bookingSeats.id,
        showSeatId: bookingSeats.showSeatId,
        price: bookingSeats.price,
        rowLabel: seats.rowLabel,
        seatNumber: seats.seatNumber,
        seatType: seats.seatType,
      })
      .from(bookingSeats)
      .innerJoin(showSeats, eq(showSeats.id, bookingSeats.showSeatId))
      .innerJoin(seats, eq(seats.id, showSeats.seatId))
      .where(eq(bookingSeats.bookingId, bookingId));

    const [payment] = await this.db
      .select({
        status: payments.status,
        provider: payments.provider,
        paidAt: payments.paidAt,
      })
      .from(payments)
      .where(eq(payments.bookingId, bookingId))
      .orderBy(desc(payments.createdAt))
      .limit(1);

    return {
      ...row.booking,
      show: {
        ...row.show,
        movie: row.movie,
        screen: {
          ...row.screen,
          cinema: row.cinema,
        },
      },
      seats: seatRows,
      payment: payment ?? null,
    };
  }
}
