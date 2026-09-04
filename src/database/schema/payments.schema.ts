import {
  decimal,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { bookings } from './bookings.schema';

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id),

    provider: varchar('provider', { length: 30 }).notNull().default('STRIPE'),

    providerPaymentId: varchar('provider_payment_id', {
      length: 255,
    }),

    amount: decimal('amount', {
      precision: 10,
      scale: 2,
    }).notNull(),

    currency: varchar('currency', { length: 10 }).notNull().default('AED'),

    status: varchar('status', { length: 30 }).notNull().default('PENDING'),

    idempotencyKey: varchar('idempotency_key', {
      length: 255,
    }).notNull(),

    paidAt: timestamp('paid_at', {
      withTimezone: true,
    }),

    failedAt: timestamp('failed_at', {
      withTimezone: true,
    }),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => [
    unique('payments_idempotency_key_unique').on(table.idempotencyKey),
  ],
);
