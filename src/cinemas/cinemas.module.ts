import { Module } from '@nestjs/common';
import { CinemasService } from './cinemas.service';
import { CinemasController } from './cinemas.controller';

@Module({
  providers: [CinemasService],
  controllers: [CinemasController]
})
export class CinemasModule {}
