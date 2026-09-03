import {
  boolean,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { screens } from './screens.schema';

export const seats = pgTable(
  'seats',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    screenId: uuid('screen_id')
      .notNull()
      .references(() => screens.id),

    rowLabel: varchar('row_label', {
      length: 10,
    }).notNull(),

    seatNumber: integer('seat_number').notNull(),

    seatType: varchar('seat_type', {
      length: 30,
    })
      .notNull()
      .default('STANDARD'),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => [
    unique('seats_screen_row_number_unique').on(
      table.screenId,
      table.rowLabel,
      table.seatNumber,
    ),
  ],
);
