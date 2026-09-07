import {
  BadRequestException,
  Controller,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import type { AuthUser } from 'src/auth/auth-user.type';
import { CurrentUser } from 'src/auth/current-user.decorator';

@ApiTags('payments')
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('bookings/:bookingId/payment')
  createPayment(
    @CurrentUser() user: AuthUser,
    @Param('bookingId', ParseUUIDPipe)
    bookingId: string,
  ) {
    return this.paymentsService.createPayment(bookingId, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('bookings/:bookingId/payment/sync')
  syncPayment(
    @CurrentUser() user: AuthUser,
    @Param('bookingId', ParseUUIDPipe)
    bookingId: string,
  ) {
    return this.paymentsService.syncPayment(bookingId, user.id);
  }

  @Post('payments/webhook')
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!request.rawBody) {
      throw new BadRequestException('Missing request body');
    }

    const event = this.paymentsService.verifyWebhookSignature(
      request.rawBody,
      signature,
    );

    await this.paymentsService.handleWebhookEvent(event);

    return { received: true };
  }
}
