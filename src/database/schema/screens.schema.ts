import {
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { cinemas } from './cinemas.schema';

export const screens = pgTable(
  'screens',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    cinemaId: uuid('cinema_id')
      .notNull()
      .references(() => cinemas.id),

    name: varchar('name', {
      length: 100,
    }).notNull(),

    screenType: varchar('screen_type', {
      length: 50,
    }),

    totalSeats: integer('total_seats').notNull(),

    status: varchar('status', {
      length: 30,
    })
      .notNull()
      .default('ACTIVE'),

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
    unique('screens_cinema_name_unique').on(table.cinemaId, table.name),
  ],
);
