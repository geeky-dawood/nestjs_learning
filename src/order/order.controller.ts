import { Body, Controller, Post } from '@nestjs/common';
import { OrderService } from './order.service';
import { PlaceOrderDto } from 'src/dto/place_order.dto';

@Controller('order')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post('/place-order')
  createOrder(@Body() body: PlaceOrderDto) {
    return this.orderService.createOrder(body);
  }
}
