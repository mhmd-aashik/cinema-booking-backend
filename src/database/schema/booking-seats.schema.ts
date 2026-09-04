import { decimal, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { bookings } from './bookings.schema';
import { showSeats } from './show-seats.schema';

export const bookingSeats = pgTable(
  'booking_seats',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // The booking this selected seat belongs to
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id),

    // The actual seat for a particular show
    showSeatId: uuid('show_seat_id')
      .notNull()
      .references(() => showSeats.id),

    // Copy the price at booking time.
    // This protects us if the show-seat price changes later.
    price: decimal('price', {
      precision: 10,
      scale: 2,
    }).notNull(),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => [
    // Prevent adding the same seat twice to the same booking.
    unique('booking_seats_booking_show_seat_unique').on(
      table.bookingId,
      table.showSeatId,
    ),
  ],
);
