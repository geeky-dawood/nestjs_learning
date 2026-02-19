import { BadRequestException, Injectable } from '@nestjs/common';
import { PlaceOrderDto } from 'src/dto/place_order.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async createOrder(payload: PlaceOrderDto) {
    try {
      if (payload.items.length === 0) {
        throw new BadRequestException(
          'Please add atleast an product to place order.',
        );
      }

      return this.prisma.$transaction(async (tx) => {
        const productIds = payload.items.map((item) => item.product_id);

        const findProdfucts = await tx.product.findMany({
          where: {
            id: { in: productIds },
          },
        });

        let total = 0;

        for (const items of payload.items) {
          const product = findProdfucts.find((p) => p.id === items.product_id);
          if (!product) {
            throw new BadRequestException('Product not found');
          }
          if (product.quantity < items.quantity) {
            throw new BadRequestException('Not enough stock');
          }
          total += product.price * items.quantity;
        }

        const order = await tx.order.create({
          data: {
            order_number: Math.floor(Math.random() * 100000),
            total_price: total,
          },
        });

        const orderItemsData = payload.items.map((item) => {
          const product = findProdfucts.find((p) => p.id === item.product_id);
          if (!product) {
            throw new BadRequestException('Product not found');
          }
          return {
            orderId: order.id,
            productId: product.id,
            quantity: item.quantity,
            price: product.price,
          };
        });

        await tx.orderItem.createMany({
          data: orderItemsData,
        });

        for (const item of payload.items) {
          await tx.product.update({
            where: { id: item.product_id },
            data: { quantity: { decrement: item.quantity } },
          });
        }

        return {
          message: 'order Placed',
          data: order,
        };
      });
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }
}
