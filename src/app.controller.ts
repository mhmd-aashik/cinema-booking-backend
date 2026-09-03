import { Controller, Get } from '@nestjs/common';

import { DatabaseService } from './database/database.service';

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
