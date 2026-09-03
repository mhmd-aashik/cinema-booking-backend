import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateScreenDto {
  @IsUUID()
  cinemaId: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  screenType?: string;

  @IsInt()
  @Min(1)
  totalSeats: number;
}
