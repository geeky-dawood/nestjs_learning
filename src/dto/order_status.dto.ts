import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { OrderStatusEnum } from '../generated/prisma/enums';

export class OrderStatusDto {
  @IsString()
  @IsNotEmpty()
  order_id: string;

  @IsEnum(OrderStatusEnum)
  @IsNotEmpty()
  status: OrderStatusEnum;
}
