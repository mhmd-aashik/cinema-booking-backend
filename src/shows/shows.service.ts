import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from 'src/database/database.constants';
import type { Database } from 'src/database/database.types';
import {
  movies,
  screens,
  cinemas,
  seats,
  shows,
  showSeats,
} from 'src/database/schema';
import { CreateShowDto } from './dto/create-show.dto';
import { FindShowsDto } from './dto/find-shows.dto';
import { RedisService } from 'src/infrastructure/redis/redis.service';

@Injectable()
export class ShowsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,

    private readonly redisService: RedisService,
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

  async findAll(filter: FindShowsDto) {
    const conditions = [
      filter.movieId ? eq(shows.movieId, filter.movieId) : undefined,
      filter.cinemaId ? eq(cinemas.id, filter.cinemaId) : undefined,
    ].filter((condition) => condition !== undefined);

    const rows = await this.db
      .select({
        show: shows,
        movie: movies,
        screen: screens,
        cinema: cinemas,
      })
      .from(shows)
      .innerJoin(movies, eq(movies.id, shows.movieId))
      .innerJoin(screens, eq(screens.id, shows.screenId))
      .innerJoin(cinemas, eq(cinemas.id, screens.cinemaId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(shows.startsAt));

    return rows.map(({ show, movie, screen, cinema }) => ({
      ...show,
      movie,
      screen: {
        ...screen,
        cinema,
      },
    }));
  }

  async findOne(id: string) {
    const [row] = await this.db
      .select({
        show: shows,
        movie: movies,
        screen: screens,
        cinema: cinemas,
      })
      .from(shows)
      .innerJoin(movies, eq(movies.id, shows.movieId))
      .innerJoin(screens, eq(screens.id, shows.screenId))
      .innerJoin(cinemas, eq(cinemas.id, screens.cinemaId))
      .where(eq(shows.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundException('Show not found');
    }

    return {
      ...row.show,
      movie: row.movie,
      screen: {
        ...row.screen,
        cinema: row.cinema,
      },
    };
  }

  async findSeats(showId: string) {
    const [show] = await this.db
      .select({ id: shows.id })
      .from(shows)
      .where(eq(shows.id, showId))
      .limit(1);

    if (!show) {
      throw new NotFoundException('Show not found');
    }

    const rows = await this.db
      .select({
        id: showSeats.id,
        price: showSeats.price,
        status: showSeats.status,
        rowLabel: seats.rowLabel,
        seatNumber: seats.seatNumber,
        seatType: seats.seatType,
      })
      .from(showSeats)
      .innerJoin(seats, eq(seats.id, showSeats.seatId))
      .where(eq(showSeats.showId, showId))
      .orderBy(asc(seats.rowLabel), asc(seats.seatNumber));

    const availableIds = rows
      .filter((seat) => seat.status === 'AVAILABLE')
      .map((seat) => seat.id);

    const heldIds = await this.redisService.getHeldSeatIds(availableIds);

    return rows.map((seat) => ({
      ...seat,
      status: heldIds.has(seat.id) ? 'HELD' : seat.status,
    }));
  }
}
