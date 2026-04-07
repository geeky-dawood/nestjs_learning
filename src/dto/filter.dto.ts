import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatusEnum } from '../generated/prisma/enums';
import { PaginationDto } from '../utils/pagination';

export class OrderFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(OrderStatusEnum)
  filter?: OrderStatusEnum;
}
