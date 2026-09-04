import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { REDIS_CLIENT } from './redis.constants';

export const redisProvider = {
  provide: REDIS_CLIENT,

  useFactory: (configService: ConfigService) => {
    const redisUrl = configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      throw new Error('REDIS_URL is not configured');
    }

    return new Redis(redisUrl);
  },

  inject: [ConfigService],
};
