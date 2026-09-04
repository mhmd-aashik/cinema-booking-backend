import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './database/database.module';
import { MoviesModule } from './movies/movies.module';
import { CinemasModule } from './cinemas/cinemas.module';
import { ScreensModule } from './screens/screens.module';
import { SeatsModule } from './seats/seats.module';
import { ShowsModule } from './shows/shows.module';
import { UsersModule } from './users/users.module';
import { BookingsModule } from './bookings/bookings.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule,
    DatabaseModule,
    MoviesModule,
    CinemasModule,
    ScreensModule,
    SeatsModule,
    ShowsModule,
    UsersModule,
    BookingsModule,
    PaymentsModule,
  ],
})
export class AppModule {}
