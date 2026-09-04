import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { DATABASE_CONNECTION } from 'src/database/database.constants';
import type { Database } from 'src/database/database.types';
import { CreateScreenDto } from './dto/create-screen.dto';
import { and, eq } from 'drizzle-orm';
import { cinemas, screens } from 'src/database/schema';

@Injectable()
export class ScreensService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async create(dto: CreateScreenDto) {
    const [cinema] = await this.db
      .select({
        id: cinemas.id,
      })
      .from(cinemas)
      .where(eq(cinemas.id, dto.cinemaId))
      .limit(1);

    if (!cinema) {
      throw new BadRequestException('Cinema does not exist');
    }

    const [existingScreen] = await this.db
      .select({
        id: screens.id,
      })
      .from(screens)
      .where(
        and(eq(screens.cinemaId, dto.cinemaId), eq(screens.name, dto.name)),
      )
      .limit(1);

    if (existingScreen) {
      throw new ConflictException(
        'A screen with this name already exists in this cinema',
      );
    }

    const [screen] = await this.db
      .insert(screens)
      .values({
        cinemaId: dto.cinemaId,
        name: dto.name,
        screenType: dto.screenType,
        totalSeats: dto.totalSeats,
      })
      .returning();

    return screen;
  }

  async findAll() {
    return this.db.select().from(screens);
  }
}
