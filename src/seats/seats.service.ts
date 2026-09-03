import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { screens, seats } from '../database/schema';

import { CreateSeatsDto } from './dto/create-seats.dto';

@Injectable()
export class SeatsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async createForScreen(screenId: string, dto: CreateSeatsDto) {
    const [screen] = await this.db
      .select({
        id: screens.id,
      })
      .from(screens)
      .where(eq(screens.id, screenId))
      .limit(1);

    if (!screen) {
      throw new NotFoundException('Screen not found');
    }

    // Example:
    // start = 1
    // end = 10
    //
    // Invalid:
    // start = 10
    // end = 1
    if (dto.startSeatNumber > dto.endSeatNumber) {
      throw new BadRequestException(
        'startSeatNumber must be less than or equal to endSeatNumber',
      );
    }

    // Build all seats before inserting them.
    //
    // Example:
    // rowLabel = A
    // 1 → 5
    //
    // creates:
    // A1
    // A2
    // A3
    // A4
    // A5
    const newSeats: (typeof seats.$inferInsert)[] = Array.from(
      {
        length: dto.endSeatNumber - dto.startSeatNumber + 1,
      },
      (_, index) => ({
        screenId,
        rowLabel: dto.rowLabel.toUpperCase(),
        seatNumber: dto.startSeatNumber + index,
        seatType: dto.seatType ?? 'STANDARD',
      }),
    );

    return this.db.insert(seats).values(newSeats).returning();
  }
}
