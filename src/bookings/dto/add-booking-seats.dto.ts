// src/bookings/dto/add-booking-seats.dto.ts

import { ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class AddBookingSeatsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  showSeatIds: string[];
}
