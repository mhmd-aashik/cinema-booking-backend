import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from 'src/database/database.constants';
import type { Database } from 'src/database/database.types';
import { movies } from 'src/database/schema';
import { CreateMovieDto } from './dto/create-movie.dto';

@Injectable()
export class MoviesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async findAll() {
    return this.db.select().from(movies);
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
}
