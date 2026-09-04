import { IsDateString, IsNumberString, IsUUID } from 'class-validator';

export class CreateShowDto {
  @IsUUID()
  movieId: string;

  @IsUUID()
  screenId: string;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;

  @IsNumberString()
  basePrice: string;
}
