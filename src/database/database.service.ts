import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DATABASE_CONNECTION } from './database.constants';
import type { Database } from './database.types';

@Injectable()
export class DatabaseService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async checkConnection() {
    const result = await this.db.execute(sql`
      SELECT NOW() AS current_time
    `);

    return result;
  }
}
