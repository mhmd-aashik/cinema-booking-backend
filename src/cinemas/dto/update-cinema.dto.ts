import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';

import { CreateCinemaDto } from './create-cinema.dto';

export class UpdateCinemaDto extends PartialType(CreateCinemaDto) {
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;
}
