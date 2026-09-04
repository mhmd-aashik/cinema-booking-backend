import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from 'src/database/database.constants';
import type { Database } from 'src/database/database.types';
import { cinemas } from 'src/database/schema';
import { CreateCinemaDto } from './dto/create-cinema.dto';

@Injectable()
export class CinemasService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  // Create cinema
  async create(dto: CreateCinemaDto) {
    const [cinema] = await this.db
      .insert(cinemas)
      .values({
        name: dto.name,
        address: dto.address,
        city: dto.city,
        country: dto.country,
      })
      .returning();

    return cinema;
  }

  // Get all cinemas
  async findAll() {
    return this.db.select().from(cinemas);
  }
}
