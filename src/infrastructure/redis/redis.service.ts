import { ConflictException, Inject, Injectable } from '@nestjs/common';

import Redis from 'ioredis';

import { REDIS_CLIENT } from './redis.constants';

type AcquiredLock = {
  key: string;
  value: string;
};

export type SeatHoldResult = {
  bookingId: string;
  showSeatIds: string[];
  holdToken: string;
  expiresIn: number;
};

@Injectable()
export class RedisService {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  /**
   * One Redis key represents one seat
   * for one particular show.
   */
  private getSeatHoldKey(showSeatId: string): string {
    return `seat-hold:${showSeatId}`;
  }

  /**
   * Try to hold multiple seats.
   *
   * If one fails, every seat acquired
   * by this operation is released.
   */
  async holdSeats(
    showSeatIds: string[],
    userId: string,
    bookingId: string,
  ): Promise<SeatHoldResult> {
    const ttlSeconds = 300;

    // Unique ownership token.
    const holdToken = crypto.randomUUID();

    const acquiredLocks: AcquiredLock[] = [];

    try {
      for (const showSeatId of showSeatIds) {
        const key = this.getSeatHoldKey(showSeatId);

        const value = JSON.stringify({
          userId,
          bookingId,
          holdToken,
        });

        /**
         * NX = only set if key doesn't exist
         * EX = expire automatically
         *
         * Atomic Redis operation.
         */
        const result = await this.redis.set(key, value, 'EX', ttlSeconds, 'NX');

        if (result !== 'OK') {
          throw new ConflictException(`Seat ${showSeatId} is currently held`);
        }

        acquiredLocks.push({
          key,
          value,
        });
      }

      return {
        bookingId,
        showSeatIds,
        holdToken,
        expiresIn: ttlSeconds,
      };
    } catch (error) {
      // Roll back only locks acquired
      // by this operation.
      for (const lock of acquiredLocks) {
        await this.releaseLock(lock.key, lock.value);
      }

      throw error;
    }
  }

  /**
   * Safely release seats.
   *
   * The hold will only be removed
   * if ownership still matches.
   */
  async releaseSeats(showSeatIds: string[]) {
    const keys = showSeatIds.map((id) => `seat-hold:${id}`);

    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Atomic compare-and-delete.
   *
   * Never blindly DEL a lock because
   * it may have expired and been acquired
   * by another user.
   */
  private async releaseLock(key: string, expectedValue: string): Promise<void> {
    const script = `
     if redis.call("get", KEYS[1]) == ARGV[1] then
       return redis.call("del", KEYS[1])
     else
       return 0
     end
   `;

    await this.redis.eval(script, 1, key, expectedValue);
  }

  /**
   * Check current hold information.
   */
  async getSeatHold(showSeatId: string) {
    const key = this.getSeatHoldKey(showSeatId);

    const value = await this.redis.get(key);

    if (!value) {
      return null;
    }

    return JSON.parse(value) as {
      userId: string;
      bookingId: string;
      holdToken: string;
    };
  }

  /**
   * Remaining TTL.
   */
  async getSeatHoldTtl(showSeatId: string): Promise<number> {
    const key = this.getSeatHoldKey(showSeatId);

    return this.redis.ttl(key);
  }

  /**
   * Check whether temporarily held.
   */
  async isSeatHeld(showSeatId: string): Promise<boolean> {
    const key = this.getSeatHoldKey(showSeatId);

    const result = await this.redis.exists(key);

    return result === 1;
  }
}
