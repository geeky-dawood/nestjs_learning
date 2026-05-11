import { IsNotEmpty, IsString } from 'class-validator';
import { PlaceOrderDto } from './place_order.dto';

export class SendMailOnPlaceOrderDto extends PlaceOrderDto {
  @IsString()
  @IsNotEmpty()
  order_number: string;
}
