import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from 'src/database/database.constants';
import type { Database } from 'src/database/database.types';
import { movies, screens, seats, shows, showSeats } from 'src/database/schema';
import { CreateShowDto } from './dto/create-show.dto';

@Injectable()
export class ShowsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async create(dto: CreateShowDto) {
    // Check that the movie exists.
    const [movie] = await this.db
      .select({
        id: movies.id,
      })
      .from(movies)
      .where(eq(movies.id, dto.movieId))
      .limit(1);

    if (!movie) {
      throw new NotFoundException('Movie not found');
    }

    // Check that the screen exists.
    const [screen] = await this.db
      .select({
        id: screens.id,
      })
      .from(screens)
      .where(eq(screens.id, dto.screenId))
      .limit(1);

    if (!screen) {
      throw new NotFoundException('Screen not found');
    }

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    // End time must be after start time.
    if (endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    return this.db.transaction(async (tx) => {
      // 1. Create the show
      const [show] = await tx
        .insert(shows)
        .values({
          movieId: dto.movieId,
          screenId: dto.screenId,
          startsAt,
          endsAt,
          basePrice: dto.basePrice,
        })
        .returning();

      // 2. Find every active physical seat
      // belonging to this screen.

      const screenSeats = await tx
        .select()
        .from(seats)
        .where(eq(seats.screenId, dto.screenId));

      // 3. Convert physical seats into
      // show-specific seats.

      const newShowSeats: (typeof showSeats.$inferInsert)[] = screenSeats.map(
        (seat) => ({
          showId: show.id,
          seatId: seat.id,

          // Initially use the show's base price.
          // Later VIP seats can apply another price.
          price: dto.basePrice,
        }),
      );

      // 4. Insert them in one query.
      if (newShowSeats.length > 0) {
        await tx.insert(showSeats).values(newShowSeats);
      }

      return show;
    });
  }
}
