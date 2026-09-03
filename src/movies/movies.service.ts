import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from 'src/database/database.constants';
import type { Database } from 'src/database/database.types';
import { movies } from 'src/database/schema';

@Injectable()
export class MoviesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async findAll() {
    return this.db.select().from(movies);
  }
}
