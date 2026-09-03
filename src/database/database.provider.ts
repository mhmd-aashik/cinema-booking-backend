import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { DATABASE_CONNECTION } from './database.constants';

export const databaseProvider = {
  provide: DATABASE_CONNECTION,

  useFactory: (configService: ConfigService) => {
    const databaseUrl = configService.get<string>('DATABASE_URL');

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not configured');
    }

    const pool = new Pool({
      connectionString: databaseUrl,
    });

    return drizzle(pool);
  },

  inject: [ConfigService],
};
