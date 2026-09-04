import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateShowDto } from './dto/create-show.dto';
import { ShowsService } from './shows.service';

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
