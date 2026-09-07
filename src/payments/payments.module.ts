import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { QueueModule } from 'src/infrastructure/queue/queue.module';
import { SeatsModule } from 'src/seats/seats.module';

@Module({
  imports: [QueueModule, SeatsModule],
  providers: [PaymentsService],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
