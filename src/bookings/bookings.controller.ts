import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { AddBookingSeatsDto } from './dto/add-booking-seats.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  async create(@Body() dto: CreateBookingDto) {
    return this.bookingsService.create(dto);
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
}
