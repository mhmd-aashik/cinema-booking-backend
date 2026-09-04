import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from 'src/database/database.constants';
import type { Database } from 'src/database/database.types';
import { users, shows, bookings } from 'src/database/schema';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
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
}
