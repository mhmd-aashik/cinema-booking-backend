import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CreateShowDto } from './dto/create-show.dto';
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
  async findAll() {
    return this.showsService.findAll();
  }
}
