import { ConflictException, Inject, Injectable } from '@nestjs/common';

import Redis from 'ioredis';

import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async holdSeat(showSeatId: string, userId: string, bookingId: string) {
    // One Redis key represents one show-specific seat.
    const key = `seat-hold:${showSeatId}`;

    // Store enough information to know
    // who currently owns this temporary hold.
    const value = JSON.stringify({
      userId,
      bookingId,
    });

    // Hold expires after 5 minutes.
    const ttlSeconds = 300;

    const result = await this.redis.set(key, value, 'EX', ttlSeconds, 'NX');

    // NX returns null when the key already exists.
    if (result !== 'OK') {
      throw new ConflictException('Seat is currently held by another customer');
    }

    return {
      showSeatId,
      expiresIn: ttlSeconds,
    };
  }
}
