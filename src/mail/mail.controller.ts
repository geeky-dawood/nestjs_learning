import { Controller, Post, Body } from '@nestjs/common';
import { MailService } from './mail.service';
import { OrderStatusDto } from '../dto/order_status.dto';
import { GetUser } from '../auth/decorator/user.decorator';
import { SendMailOnPlaceOrderDto } from '../dto/send_mail_place_order.dto';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('order-placed')
  async orderPlaced(
    @GetUser('id') user_id: string,
    @Body() body: SendMailOnPlaceOrderDto,
  ) {
    await this.mailService.sendOrderPlacedEmail(
      user_id,
      body.items,
      body.order_number,
    );

    return { message: 'Order email sent' };
  }

  @Post('order-status')
  async orderStatusUpdated(
    @GetUser('id') user_id: string,
    @Body() body: OrderStatusDto,
  ) {
    await this.mailService.sendOrderStatusEmail(user_id, body);

    return { message: 'Status email sent' };
  }
}
