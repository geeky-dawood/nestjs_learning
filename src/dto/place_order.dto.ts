import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class PlaceOrderDto {
  @ValidateNested({ each: true })
  @Type(() => OrderProductDto)
  items: OrderProductDto[];
}

export class OrderProductDto {
  @IsString()
  @IsNotEmpty({ message: 'product_id is required' })
  product_id: string;

  @IsNumber()
  @IsNotEmpty({ message: 'quantity is required' })
  @Min(1, { message: 'quantity must be at least 1' })
  quantity: number;
}
