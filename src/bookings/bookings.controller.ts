import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { AddBookingSeatsDto } from './dto/add-booking-seats.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import type { AuthUser } from 'src/auth/auth-user.type';
import { CurrentUser } from 'src/auth/current-user.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';

@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,

    @InjectQueue('booking')
    private readonly bookingQueue: Queue,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(user.id, dto);
  }

  @Post(':bookingId/seats')
  addSeats(
    @Param('bookingId', ParseUUIDPipe)
    bookingId: string,

    @Body()
    dto: AddBookingSeatsDto,
  ) {
    return this.bookingsService.addSeats(bookingId, dto.showSeatIds);
  }

  @Post(':bookingId/test-email')
  async testEmail(
    @Param('bookingId', ParseUUIDPipe)
    bookingId: string,
  ) {
    await this.bookingQueue.add('send-confirmation-email', {
      bookingId,
    });

    return {
      message: 'Email job added',
    };
  }
}
