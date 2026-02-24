import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { PlaceOrderDto } from 'src/dto/place_order.dto';
import { PaginationDto } from 'src/utils/pagination';

@Controller('order')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post('/create')
  createOrder(@Query('user_id') id: string, @Body() body: PlaceOrderDto) {
    if (!id?.trim()) {
      throw new ForbiddenException('User ID is required.');
    }
    return this.orderService.createOrder(id, body);
  }

  @Get('/all-orders')
  getAllOrders(@Query() pagination: PaginationDto) {
    return this.orderService.getAllOrders(pagination);
  }

  @Get('/:orderId')
  getOrderByOrderId(@Param('orderId') orderId: string) {
    return this.orderService.getOrderByOrderId(orderId);
  }

  @Get('/user/:userId')
  orderByUserId(
    @Param('userId') user_id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.orderService.getOrderByUserId(user_id, pagination);
  }

  @Delete('/delete/:orderId')
  deleteOrderByOrderId(@Param('orderId') orderId: string) {
    return this.orderService.deleteOrderByOrderId(orderId);
  }
}
