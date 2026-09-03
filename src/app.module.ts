import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './database/database.module';
import { MoviesModule } from './movies/movies.module';
import { CinemasModule } from './cinemas/cinemas.module';
import { ScreensModule } from './screens/screens.module';
import { SeatsModule } from './seats/seats.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    MoviesModule,
    CinemasModule,
    ScreensModule,
    SeatsModule,
  ],
})
export class AppModule {}
