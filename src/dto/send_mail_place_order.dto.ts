import { IsString } from 'class-validator';
import { PlaceOrderDto } from './place_order.dto';

export class SendMailOnPlaceOrderDto extends PlaceOrderDto {
  @IsString()
  order_number: string;
}
