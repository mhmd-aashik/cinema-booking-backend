import {
  decimal,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { shows } from './shows.schema';
import { users } from './users.schema';

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Who is making the booking.
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),

    // Which show the booking belongs to.
    showId: uuid('show_id')
      .notNull()
      .references(() => shows.id),

    // Human-friendly booking code.
    bookingReference: varchar('booking_reference', {
      length: 50,
    }).notNull(),

    // PENDING
    // CONFIRMED
    // CANCELLED
    status: varchar('status', {
      length: 30,
    })
      .notNull()
      .default('PENDING'),

    totalAmount: decimal('total_amount', {
      precision: 10,
      scale: 2,
    }).notNull(),

    currency: varchar('currency', {
      length: 10,
    })
      .notNull()
      .default('AED'),

    // When an unpaid booking should expire.
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
    }),

    confirmedAt: timestamp('confirmed_at', {
      withTimezone: true,
    }),

    cancelledAt: timestamp('cancelled_at', {
      withTimezone: true,
    }),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => [unique('bookings_reference_unique').on(table.bookingReference)],
);
