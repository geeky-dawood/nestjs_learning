import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { ProductModule } from '../product/product.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [ProductModule, MailModule],
  providers: [OrderService],
  controllers: [OrderController],
})
export class OrderModule {}
