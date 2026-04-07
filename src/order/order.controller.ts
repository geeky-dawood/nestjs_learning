import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { PlaceOrderDto } from '../dto/place_order.dto';
import { PaginationDto } from '../utils/pagination';
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { RolesGuard } from '../auth/guard/role.auth.guard';
import { Roles } from '../auth/decorator/role.decorator';
import { SearchDto } from '../dto/serach.dto';
import { OrderStatusDto } from '../dto/order_status.dto';

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

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get('/all-orders')
  async getAllOrders(@Query() query: SearchDto) {
    return await this.orderService.getAllOrders(query);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch('/change-order-status')
  async changeOrderStatus(@Query() query: OrderStatusDto) {
    return await this.orderService.changeOrderStatus(query);
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
