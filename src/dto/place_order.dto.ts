import { Type } from 'class-transformer';
import { IsNumber, IsString, ValidateNested } from 'class-validator';

export class PlaceOrderDto {
  @ValidateNested({ each: true })
  @Type(() => OrderProductDto)
  items: OrderProductDto[];
}

export class OrderProductDto {
  @IsString()
  product_id: string;

  @IsNumber()
  quantity: number;
}
