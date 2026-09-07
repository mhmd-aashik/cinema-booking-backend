import { IsOptional, IsUUID } from 'class-validator';

export class FindShowsDto {
  @IsOptional()
  @IsUUID()
  movieId?: string;

  @IsOptional()
  @IsUUID()
  cinemaId?: string;
}
