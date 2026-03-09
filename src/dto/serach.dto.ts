import { IsOptional, IsString, Matches } from 'class-validator';
import { OrderFilterDto } from './filter.dto';

export class SearchDto extends OrderFilterDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]+(?: [A-Za-z0-9]+)*$/, {
    message: 'Keywords can contain letters, numbers, and single spaces only',
  })
  search: string;
}
