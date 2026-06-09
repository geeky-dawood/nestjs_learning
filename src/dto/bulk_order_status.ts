import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  ValidateNested,
  ArrayNotEmpty,
  IsOptional,
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { OrderStatusEnum, PaymentStatus } from '../generated/prisma/enums';

export class OrderStatusUpdateItemDto {
  @IsString()
  @IsNotEmpty()
  order_id: string;

  @IsEnum(OrderStatusEnum, {
    message: 'Invalid order status',
  })
  @IsOptional()
  order_status?: OrderStatusEnum;

  @IsEnum(PaymentStatus, {
    message: 'Invalid payment status',
  })
  @IsOptional()
  payment_status?: PaymentStatus;
}

export class BulkOrderStatusDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderStatusUpdateItemDto)
  orders: OrderStatusUpdateItemDto[];
}
function ISNotEmpty(): (
  target: OrderStatusUpdateItemDto,
  propertyKey: 'order_id',
) => void {
  throw new Error('Function not implemented.');
}
