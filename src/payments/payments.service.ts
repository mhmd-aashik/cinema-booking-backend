import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { SeatsGateway } from 'src/seats/seats.gateway';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;
  private readonly webhookSecret?: string;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
    private readonly configService: ConfigService,

    private readonly redisService: RedisService,

    private readonly seatsGateway: SeatsGateway,

    @InjectQueue('booking')
    private readonly bookingQueue: Queue,
  ) {
    this.stripe = new Stripe(
      configService.getOrThrow<string>('STRIPE_SECRET_KEY'),
    );

    this.webhookSecret = configService.get<string>('STRIPE_WEBHOOK_SECRET');
  }

  async createPayment(bookingId: string, userId: string) {
    const [booking] = await this.db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('This booking does not belong to you');
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
        automatic_payment_methods: {
          enabled: true,
        },
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

  /**
   * Called after the Stripe webhook (or, in local dev without a webhook
   * tunnel, directly by the frontend right after `stripe.confirmPayment`)
   * to reconcile a PaymentIntent's status with our own records.
   */
  async syncPayment(bookingId: string, userId: string) {
    const [booking] = await this.db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('This booking does not belong to you');
    }

    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, bookingId))
      .limit(1);

    if (!payment || !payment.providerPaymentId) {
      throw new BadRequestException('No payment found for this booking');
    }

    const paymentIntent = await this.stripe.paymentIntents.retrieve(
      payment.providerPaymentId,
    );

    if (paymentIntent.status === 'succeeded') {
      await this.confirmPayment(paymentIntent.id);
    } else if (
      paymentIntent.status === 'canceled' ||
      paymentIntent.status === 'requires_payment_method'
    ) {
      await this.db
        .update(payments)
        .set({
          status: 'FAILED',
          failedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));
    }

    return { status: paymentIntent.status };
  }

  verifyWebhookSignature(payload: Buffer, signature: string) {
    if (!this.webhookSecret) {
      // No webhook secret configured (local/dev). Parse without verifying.
      return JSON.parse(payload.toString()) as Stripe.Event;
    }

    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret,
    );
  }

  async handleWebhookEvent(event: Stripe.Event) {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await this.confirmPayment(paymentIntent.id);
    }

    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      await this.db
        .update(payments)
        .set({
          status: 'FAILED',
          failedAt: new Date(),
        })
        .where(eq(payments.providerPaymentId, paymentIntent.id));
    }
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
    let showId: string | undefined;

    await this.db.transaction(async (tx) => {
      await tx
        .update(payments)
        .set({
          status: 'SUCCEEDED',
          paidAt: new Date(),
        })
        .where(eq(payments.id, payment.id));

      const [updatedBooking] = await tx
        .update(bookings)
        .set({
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, payment.bookingId))
        .returning();

      showId = updatedBooking?.showId;

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

    if (showId && showSeatIds.length > 0) {
      this.seatsGateway.notifySeatBooked(showId, showSeatIds);
    }

    // Background jobs
    await this.bookingQueue.add('generate-ticket-qr', {
      bookingId: payment.bookingId,
    });

    await this.bookingQueue.add('send-confirmation-email', {
      bookingId: payment.bookingId,
    });
  }
}
