import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';

import { CreateSeatsDto } from './dto/create-seats.dto';
import { SeatsService } from './seats.service';

@Controller('screens/:screenId/seats')
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @Post()
  async createForScreen(
    @Param('screenId', new ParseUUIDPipe())
    screenId: string,

    @Body()
    dto: CreateSeatsDto,
  ) {
    return this.seatsService.createForScreen(screenId, dto);
  }
}
