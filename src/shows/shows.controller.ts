import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CreateShowDto } from './dto/create-show.dto';
import { FindShowsDto } from './dto/find-shows.dto';
import { ShowsService } from './shows.service';

@ApiTags('shows')
@Controller('shows')
export class ShowsController {
  constructor(private readonly showsService: ShowsService) {}

  @Post()
  async create(@Body() dto: CreateShowDto) {
    return this.showsService.create(dto);
  }

  @Get()
  async findAll(@Query() filter: FindShowsDto) {
    return this.showsService.findAll(filter);
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.showsService.findOne(id);
  }

  @Get(':id/seats')
  async findSeats(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.showsService.findSeats(id);
  }
}
