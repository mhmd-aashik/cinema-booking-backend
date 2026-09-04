import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateScreenDto } from './dto/create-screen.dto';
import { ScreensService } from './screens.service';

@Controller('screens')
export class ScreensController {
  constructor(private readonly screensService: ScreensService) {}

  @Post()
  async create(@Body() dto: CreateScreenDto) {
    return this.screensService.create(dto);
  }

  @Get()
  async findAll() {
    return this.screensService.findAll();
  }
}
