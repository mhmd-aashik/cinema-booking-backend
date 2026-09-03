import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSeatsDto {
  @IsString()
  @MaxLength(10)
  rowLabel: string;

  @IsInt()
  @Min(1)
  startSeatNumber: number;

  @IsInt()
  @Min(1)
  endSeatNumber: number;

  @IsOptional()
  @IsIn(['STANDARD', 'VIP', 'PREMIUM'])
  seatType?: string;
}
