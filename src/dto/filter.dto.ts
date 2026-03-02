import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatusEnum } from 'src/generated/prisma/enums';
import { PaginationDto } from 'src/utils/pagination';

export class OrderFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(OrderStatusEnum)
  filter?: OrderStatusEnum;
}
