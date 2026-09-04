import { ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class AddBookingSeatsDto {
  // Client sends the IDs from show_seats,
  // not physical seats.id.
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  showSeatIds: string[];
}
