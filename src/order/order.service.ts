import { Injectable } from '@nestjs/common';
import { PlaceOrderDto } from 'src/dto/place_order.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async createOrder(payload: PlaceOrderDto) {
    // const order = await this.prisma.order.create({
    //   //   data: {
    //   //     items: {},
    //   //   },
    // });
  }
}
