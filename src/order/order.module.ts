import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { ProductModule } from '../product/product.module';
import { PaginationModule } from '../pagination/pagination.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ProductModule, PrismaModule, PaginationModule],
  providers: [OrderService],
  controllers: [OrderController],
})
export class OrderModule {}
