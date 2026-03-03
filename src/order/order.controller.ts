import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { PlaceOrderDto } from 'src/dto/place_order.dto';
import { PaginationDto } from 'src/utils/pagination';
import { OrderFilterDto } from 'src/dto/filter.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt.auth.guard';

@UseGuards(JwtAuthGuard)
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
  async getAllOrders(@Query() query: OrderFilterDto) {
    return await this.orderService.getAllOrders(query);
  }

  @Get('/user/:userId')
  orderByUserId(
    @Param('userId') user_id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.orderService.getOrderByUserId(user_id, pagination);
  }

  @Get('/:orderId')
  getOrderByOrderId(@Param('orderId') orderId: string) {
    return this.orderService.getOrderByOrderId(orderId);
  }

  @Delete('/delete/:orderId')
  deleteOrderByOrderId(@Param('orderId') orderId: string) {
    return this.orderService.deleteOrderByOrderId(orderId);
  }
}
