import { Module } from '@nestjs/common';
import { ScreensService } from './screens.service';
import { ScreensController } from './screens.controller';

@Module({
  providers: [ScreensService],
  controllers: [ScreensController]
})
export class ScreensModule {}
