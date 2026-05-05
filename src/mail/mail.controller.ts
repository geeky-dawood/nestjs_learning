import { Controller, Post, Body } from '@nestjs/common';
import { MailService } from './mail.service';
import { OrderStatusDto } from '../dto/order_status.dto';
import { OrderProductDto, PlaceOrderDto } from '../dto/place_order.dto';
import { GetUser } from '../auth/decorator/user.decorator';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  // @Post('order-placed')
  async orderPlaced(
    userId: string,
    @Body() body: PlaceOrderDto,
    @Body('orderNumber') orderNumber: string,
  ) {
    await this.mailService.sendOrderPlacedEmail(
      userId,
      body.items,
      orderNumber,
    );

    return { message: 'Order email sent' };
  }

  @Post('order-status')
  async orderStatusUpdated(userId: string, @Body() body: OrderStatusDto) {
    await this.mailService.sendOrderStatusEmail(userId, body);

    return { message: 'Status email sent' };
  }
}
