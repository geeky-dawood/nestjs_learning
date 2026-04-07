import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [ProductModule],
  providers: [OrderService],
  controllers: [OrderController],
})
export class OrderModule {}
