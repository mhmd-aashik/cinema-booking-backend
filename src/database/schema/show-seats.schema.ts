import {
  decimal,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { seats } from './seats.schema';
import { shows } from './shows.schema';

export const showSeats = pgTable(
  'show_seats',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Which show this seat belongs to.
    showId: uuid('show_id')
      .notNull()
      .references(() => shows.id),

    // Which physical seat this represents.
    seatId: uuid('seat_id')
      .notNull()
      .references(() => seats.id),

    price: decimal('price', {
      precision: 10,
      scale: 2,
    }).notNull(),

    status: varchar('status', {
      length: 30,
    })
      .notNull()
      .default('AVAILABLE'),

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

  (table) => [
    // The same physical seat can appear only once
    // for a particular show.
    //
    // Show 1 + A1 ✅
    // Show 1 + A1 ❌ duplicate
    // Show 2 + A1 ✅
    unique('show_seats_show_seat_unique').on(table.showId, table.seatId),
  ],
);
