import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { DatabaseService } from './database/database.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get('health/database')
  async checkDatabase() {
    await this.databaseService.checkConnection();

    return {
      status: 'ok',
      database: 'connected',
    };
  }
}
