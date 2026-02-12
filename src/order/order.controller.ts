import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guard/jwt.auth.guard';
import { OrderService } from './order.service';
import { CreateOrderDto } from 'src/dto/create_order.dto';

@UseGuards(JwtAuthGuard)
@Controller('order')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post('/create-order')
  createOrder(@Body() body: CreateOrderDto) {
    return this.orderService.createOrder();
  }
}
