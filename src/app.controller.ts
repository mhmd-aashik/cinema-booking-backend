import { Controller, Get } from '@nestjs/common';

import { DatabaseService } from './database/database.service';

@Controller()
export class AppController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get('health/database')
  async checkDatabase() {
    // Ask DatabaseService to test PostgreSQL.
    await this.databaseService.checkConnection();

    // If PostgreSQL responds successfully,
    // return a simple health response.
    return {
      status: 'ok',
      database: 'connected',
    };
  }
}
