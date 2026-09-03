import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const cinemas = pgTable('cinemas', {
  id: uuid('id').defaultRandom().primaryKey(),

  name: varchar('name', {
    length: 255,
  }).notNull(),

  address: varchar('address', {
    length: 255,
  }),

  city: varchar('city', {
    length: 100,
  }),

  country: varchar('country', {
    length: 100,
  }),

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
