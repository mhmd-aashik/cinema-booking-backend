import {
  Body,
  Controller,
  Get,
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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import type { AuthUser } from 'src/auth/auth-user.type';
import { CurrentUser } from 'src/auth/current-user.decorator';

@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,

    @InjectQueue('booking')
    private readonly bookingQueue: Queue,
  ) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(user.id, dto);
  }

  @Get()
  async findMine(@CurrentUser() user: AuthUser) {
    return this.bookingsService.findAllForUser(user.id);
  }

  @Get(':bookingId')
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('bookingId', ParseUUIDPipe)
    bookingId: string,
  ) {
    return this.bookingsService.findOneForUser(bookingId, user.id, user.role);
  }

  @Get(':bookingId/tickets')
  async getTickets(
    @CurrentUser() user: AuthUser,
    @Param('bookingId', ParseUUIDPipe)
    bookingId: string,
  ) {
    return this.bookingsService.getTickets(bookingId, user.id, user.role);
  }

  @Post(':bookingId/seats')
  addSeats(
    @CurrentUser() user: AuthUser,
    @Param('bookingId', ParseUUIDPipe)
    bookingId: string,

    @Body()
    dto: AddBookingSeatsDto,
  ) {
    return this.bookingsService.addSeats(bookingId, user.id, dto.showSeatIds);
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
