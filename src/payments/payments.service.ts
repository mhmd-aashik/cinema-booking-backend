import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, inArray } from 'drizzle-orm';
import Stripe from 'stripe';

import { DATABASE_CONNECTION } from 'src/database/database.constants';
import type { Database } from 'src/database/database.types';
import {
  bookings,
  bookingSeats,
  payments,
  showSeats,
} from 'src/database/schema';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
    configService: ConfigService,

    private readonly redisService: RedisService,

    @InjectQueue('booking')
    private readonly bookingQueue: Queue,
  ) {
    this.stripe = new Stripe(
      configService.getOrThrow<string>('STRIPE_SECRET_KEY'),
    );
  }

  async createPayment(bookingId: string) {
    const [booking] = await this.db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    if (booking.status !== 'PENDING') {
      throw new BadRequestException('Booking is not payable');
    }

    if (Number(booking.totalAmount) <= 0) {
      throw new BadRequestException('Booking has no seats');
    }

    // Stripe expects the smallest currency unit.
    // AED 50.00 -> 5000 fils
    const amount = Math.round(Number(booking.totalAmount) * 100);

    const idempotencyKey = `booking:${booking.id}:payment`;

    const paymentIntent = await this.stripe.paymentIntents.create(
      {
        amount,
        currency: booking.currency.toLowerCase(),
        metadata: {
          bookingId: booking.id,
        },
      },
      {
        idempotencyKey,
      },
    );

    const [payment] = await this.db
      .insert(payments)
      .values({
        bookingId: booking.id,
        provider: 'STRIPE',
        providerPaymentId: paymentIntent.id,
        amount: booking.totalAmount,
        currency: booking.currency,
        status: 'PENDING',
        idempotencyKey,
      })
      .onConflictDoNothing({
        target: payments.idempotencyKey,
      })
      .returning();

    return {
      payment,
      clientSecret: paymentIntent.client_secret,
    };
  }

  async confirmPayment(paymentIntentId: string) {
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.providerPaymentId, paymentIntentId))
      .limit(1);

    if (!payment) {
      throw new BadRequestException('Payment not found');
    }

    if (payment.status === 'SUCCEEDED') {
      return;
    }

    let showSeatIds: string[] = [];

    await this.db.transaction(async (tx) => {
      await tx
        .update(payments)
        .set({
          status: 'SUCCEEDED',
          paidAt: new Date(),
        })
        .where(eq(payments.id, payment.id));

      await tx
        .update(bookings)
        .set({
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, payment.bookingId));

      const selectedSeats = await tx
        .select({
          showSeatId: bookingSeats.showSeatId,
        })
        .from(bookingSeats)
        .where(eq(bookingSeats.bookingId, payment.bookingId));

      showSeatIds = selectedSeats.map((seat) => seat.showSeatId);

      if (showSeatIds.length > 0) {
        await tx
          .update(showSeats)
          .set({
            status: 'BOOKED',
            updatedAt: new Date(),
          })
          .where(inArray(showSeats.id, showSeatIds));
      }
    });

    // DB committed successfully
    await this.redisService.releaseSeats(showSeatIds);

    // Background jobs
    await this.bookingQueue.add('generate-ticket-qr', {
      bookingId: payment.bookingId,
    });

    await this.bookingQueue.add('send-confirmation-email', {
      bookingId: payment.bookingId,
    });
  }
}
