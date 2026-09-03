import { PartialType } from '@nestjs/mapped-types';

import { CreateMovieDto } from './create-movie.dto';
import { IsOptional, IsIn } from 'class-validator';

export class UpdateMovieDto extends PartialType(CreateMovieDto) {
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;
}
