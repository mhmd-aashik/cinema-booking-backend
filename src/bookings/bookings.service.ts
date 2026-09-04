import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DATABASE_CONNECTION } from 'src/database/database.constants';
import type { Database } from 'src/database/database.types';
import {
  users,
  shows,
  bookings,
  bookingSeats,
  showSeats,
} from 'src/database/schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RedisService } from 'src/infrastructure/redis/redis.service';

@Injectable()
export class BookingsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,

    private readonly redisService: RedisService,
  ) {}

  async create(dto: CreateBookingDto) {
    // Verify user exists.
    const [user] = await this.db
      .select({
        id: users.id,
      })
      .from(users)
      .where(eq(users.id, dto.userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify show exists.
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

    // Simple booking reference for now.
    const bookingReference = `BK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    // Temporary expiry:
    // booking remains pending for 5 minutes.
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const [booking] = await this.db
      .insert(bookings)
      .values({
        userId: dto.userId,
        showId: dto.showId,
        bookingReference,

        // No seats selected yet.
        totalAmount: '0.00',

        expiresAt,
      })
      .returning();

    return booking;
  }

  async addSeats(bookingId: string, showSeatIds: string[]) {
    // 1. Find the booking.
    const [booking] = await this.db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // 2. Only pending bookings can still be modified.
    if (booking.status !== 'PENDING') {
      throw new BadRequestException('Only pending bookings can be modified');
    }

    // 3. Check booking expiry.
    if (booking.expiresAt && booking.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Booking has expired');
    }

    // 4. Load requested seats from DB.
    // Also make sure they belong to this booking's show.
    const selectedShowSeats = await this.db
      .select()
      .from(showSeats)
      .where(
        and(
          eq(showSeats.showId, booking.showId),
          inArray(showSeats.id, showSeatIds),
        ),
      );

    // 5. Every requested seat must exist.
    if (selectedShowSeats.length !== showSeatIds.length) {
      throw new BadRequestException(
        'One or more seats are invalid for this show',
      );
    }

    // 6. For now, permanent BOOKED seats cannot be selected.
    const unavailableSeat = selectedShowSeats.find(
      (seat) => seat.status !== 'AVAILABLE',
    );

    if (unavailableSeat) {
      throw new BadRequestException('One or more seats are unavailable');
    }

    // Temporarily hold the seats in Redis for 5 minutes.
    // If another customer already holds one of them,
    // RedisService should throw a 409 Conflict.
    await this.redisService.holdSeats(showSeatIds, booking.userId, booking.id);

    // 7. Calculate price from DB.
    // Never accept seat price from the frontend.
    const totalAmount = selectedShowSeats.reduce(
      (total, seat) => total + Number(seat.price),
      0,
    );

    // 8. Create the booking-seat rows inside a transaction.
    return this.db.transaction(async (tx) => {
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

      // 9. Update the booking total.
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
  }
}
