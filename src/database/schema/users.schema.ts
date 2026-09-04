import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),

  email: varchar('email', {
    length: 255,
  })
    .notNull()
    .unique(),

  firstName: varchar('first_name', {
    length: 100,
  }),

  lastName: varchar('last_name', {
    length: 100,
  }),

  phone: varchar('phone', {
    length: 30,
  }),

  passwordHash: varchar('password_hash', {
    length: 255,
  }),

  // For this project we only need:
  // CUSTOMER
  // ADMIN
  role: varchar('role', {
    length: 30,
  })
    .notNull()
    .default('CUSTOMER'),

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
