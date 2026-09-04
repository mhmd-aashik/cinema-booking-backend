// src/infrastructure/redis/redis.service.ts

import { ConflictException, Inject, Injectable } from '@nestjs/common';

import Redis from 'ioredis';

import { REDIS_CLIENT } from './redis.constants';

type AcquiredLock = {
  key: string;
  value: string;
};

@Injectable()
export class RedisService {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  /**
   * Build one consistent Redis key for each show-specific seat.
   *
   * Example:
   * seat-hold:550e8400-e29b-41d4-a716-446655440000
   */
  private getSeatHoldKey(showSeatId: string): string {
    return `seat-hold:${showSeatId}`;
  }

  /**
   * Hold multiple seats for a booking.
   *
   * Important behavior:
   *
   * - Each seat can only have one active Redis hold.
   * - Hold expires automatically after 5 minutes.
   * - If one seat cannot be acquired, previously acquired
   *   seats from this request are safely released.
   */
  async holdSeats(showSeatIds: string[], userId: string, bookingId: string) {
    // Seat holds live for 5 minutes.
    const ttlSeconds = 300;

    // We create one token for this particular hold operation.
    //
    // This helps us prove ownership when releasing locks.
    const holdToken = crypto.randomUUID();

    // Keep track of every Redis lock acquired
    // during this request.
    const acquiredLocks: AcquiredLock[] = [];

    try {
      for (const showSeatId of showSeatIds) {
        // Create the Redis key.
        const key = this.getSeatHoldKey(showSeatId);

        // Save metadata about the owner of this hold.
        const value = JSON.stringify({
          userId,
          bookingId,
          holdToken,
        });

        /**
         * SET key value EX 300 NX
         *
         * NX:
         * Only create the key if it does not already exist.
         *
         * EX:
         * Automatically expire the key after 300 seconds.
         *
         * This SET operation is atomic.
         */
        const result = await this.redis.set(key, value, 'EX', ttlSeconds, 'NX');

        /**
         * Redis returns:
         *
         * "OK"  -> lock acquired
         * null  -> key already exists
         */
        if (result !== 'OK') {
          throw new ConflictException(
            `Seat ${showSeatId} is currently held by another customer`,
          );
        }

        // Remember the exact key and value that we own.
        acquiredLocks.push({
          key,
          value,
        });
      }

      // All requested seats were successfully held.
      return {
        bookingId,
        showSeatIds,
        holdToken,
        expiresIn: ttlSeconds,
      };
    } catch (error) {
      /**
       * If A1 and A2 succeeded but A3 failed,
       * release A1 and A2.
       *
       * We do NOT blindly call DEL.
       *
       * releaseLock() verifies that the lock still belongs
       * to this request before deleting it.
       */
      for (const lock of acquiredLocks) {
        await this.releaseLock(lock.key, lock.value);
      }

      throw error;
    }
  }

  /**
   * Release a Redis lock only if we still own it.
   *
   * Why?
   *
   * Imagine:
   *
   * Request A owns A10
   * A10 expires
   * Request B acquires A10
   * Request A tries to delete A10
   *
   * A normal DEL would incorrectly delete Request B's lock.
   *
   * This Lua script performs:
   *
   * GET + compare + DEL
   *
   * atomically.
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
   * Release every seat hold belonging to a particular booking.
   *
   * We'll use this later after:
   *
   * - successful payment
   * - booking cancellation
   * - booking failure
   */
  async releaseSeats(
    showSeatIds: string[],
    userId: string,
    bookingId: string,
    holdToken: string,
  ): Promise<void> {
    for (const showSeatId of showSeatIds) {
      const key = this.getSeatHoldKey(showSeatId);

      // Must exactly match what was stored
      // when we acquired the hold.
      const expectedValue = JSON.stringify({
        userId,
        bookingId,
        holdToken,
      });

      await this.releaseLock(key, expectedValue);
    }
  }

  /**
   * Check how long a seat hold has remaining.
   *
   * Useful later when showing:
   *
   * "Your seats are reserved for 04:32"
   */
  async getSeatHoldTtl(showSeatId: string): Promise<number> {
    const key = this.getSeatHoldKey(showSeatId);

    return this.redis.ttl(key);
  }

  /**
   * Check whether a seat currently has a temporary hold.
   */
  async isSeatHeld(showSeatId: string): Promise<boolean> {
    const key = this.getSeatHoldKey(showSeatId);

    const exists = await this.redis.exists(key);

    return exists === 1;
  }

  /**
   * Get the current hold information.
   *
   * Mainly useful for debugging and later WebSocket events.
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
}
