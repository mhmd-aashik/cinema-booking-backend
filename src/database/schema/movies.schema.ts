import {
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const movies = pgTable('movies', {
  id: uuid('id').defaultRandom().primaryKey(),

  title: varchar('title', {
    length: 255,
  }).notNull(),

  description: text('description'),

  durationMinutes: integer('duration_minutes').notNull(),

  releaseDate: date('release_date'),

  rating: varchar('rating', {
    length: 20,
  }),

  language: varchar('language', {
    length: 50,
  }),

  posterUrl: text('poster_url'),

  trailerUrl: text('trailer_url'),

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
});
