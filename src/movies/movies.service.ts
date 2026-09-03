import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from 'src/database/database.constants';
import type { Database } from 'src/database/database.types';
import { movies } from 'src/database/schema';
import { CreateMovieDto } from './dto/create-movie.dto';
import { eq } from 'drizzle-orm';
import { UpdateMovieDto } from './dto/update-movie.dto';

@Injectable()
export class MoviesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async findAll() {
    return this.db.select().from(movies);
  }

  async findOne(id: string) {
    const [movie] = await this.db
      .select()
      .from(movies)
      .where(eq(movies.id, id))
      .limit(1);

    if (!movie) {
      throw new NotFoundException('Movie not found');
    }

    return movie;
  }

  async create(dto: CreateMovieDto) {
    const [movie] = await this.db
      .insert(movies)
      .values({
        title: dto.title,
        description: dto.description,
        durationMinutes: dto.durationMinutes,
        releaseDate: dto.releaseDate,
        rating: dto.rating,
        language: dto.language,
        posterUrl: dto.posterUrl,
        trailerUrl: dto.trailerUrl,
      })
      .returning();

    return movie;
  }

  async update(id: string, dto: UpdateMovieDto) {
    const [movie] = await this.db
      .update(movies)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(movies.id, id))
      .returning();

    if (!movie) {
      throw new NotFoundException('Movie not found');
    }

    return movie;
  }

  async remove(id: string) {
    const [movie] = await this.db
      .delete(movies)
      .where(eq(movies.id, id))
      .returning();

    if (!movie) {
      throw new NotFoundException('Movie not found');
    }

    return {
      message: 'Movie deleted successfully',
    };
  }
}
