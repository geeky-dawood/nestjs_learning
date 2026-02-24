import {
  Body,
  Controller,
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

  @Post('/place-order')
  createOrder(@Query('user_id') id: string, @Body() body: PlaceOrderDto) {
    if (id === null || id === undefined || id.trim() === '') {
      throw new ForbiddenException('User ID is required.');
    }
    return this.orderService.createOrder(id, body);
  }

  @Get('/order-by/:user_id')
  orderByUserId(
    @Param('user_id') user_id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.orderService.getOrderByUserId(user_id, pagination);
  }
}
