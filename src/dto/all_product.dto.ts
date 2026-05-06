import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../utils/pagination';

export class GetAllProductsPaginationDto extends PaginationDto {
  @IsString()
  @IsOptional()
  filterByCategory?: string;
}
