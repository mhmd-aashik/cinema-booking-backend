import {
  decimal,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { movies } from './movies.schema';
import { screens } from './screens.schema';

export const shows = pgTable('shows', {
  id: uuid('id').defaultRandom().primaryKey(),

  // The movie being shown.
  movieId: uuid('movie_id')
    .notNull()
    .references(() => movies.id),

  // The physical screen where the movie plays.
  screenId: uuid('screen_id')
    .notNull()
    .references(() => screens.id),

  // Show start time.
  startsAt: timestamp('starts_at', {
    withTimezone: true,
  }).notNull(),

  // Show end time.
  endsAt: timestamp('ends_at', {
    withTimezone: true,
  }).notNull(),

  // Base ticket price.
  // Example: 45.00 AED
  basePrice: decimal('base_price', {
    precision: 10,
    scale: 2,
  }).notNull(),

  // SCHEDULED
  // CANCELLED
  // COMPLETED
  status: varchar('status', {
    length: 30,
  })
    .notNull()
    .default('SCHEDULED'),

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
});
