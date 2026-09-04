import { Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('bookings')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(':bookingId/payment')
  createPayment(
    @Param('bookingId', ParseUUIDPipe)
    bookingId: string,
  ) {
    return this.paymentsService.createPayment(bookingId);
  }
}
