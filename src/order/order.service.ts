import { BadRequestException, Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/database/base.service';
import { PlaceOrderDto } from 'src/dto/place_order.dto';
import { Order, Product } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductService } from 'src/product/product.service';

@Injectable()
export class OrderService extends BaseService<Order> {
  constructor(
    protected prisma: PrismaService,
    private readonly productService: ProductService,
  ) {
    super(prisma, prisma.order);
  }

  async createOrder(payload: PlaceOrderDto) {
    const { items: orderItems } = payload;

    if (!orderItems || orderItems.length === 0) {
      throw new BadRequestException(
        'Please add at least one product to place order.',
      );
    }

    try {
      const productIds = orderItems.map((orderItem) => orderItem.product_id);

      const uniqueProductIds = [...new Set(productIds)];

      if (uniqueProductIds.length !== productIds.length) {
        throw new BadRequestException(
          'Duplicate product found in order items. Each product must appear only once.',
        );
      }

      const products: Product[] = await this.productService.findMany({
        where: {
          id: { in: uniqueProductIds },
        },
      });

      if (products.length !== uniqueProductIds.length) {
        throw new BadRequestException(
          'One or more products not found. Please verify product IDs.',
        );
      }

      const productMap = new Map(
        products.map((product) => [product.id, product]),
      );

      let totalAmount = 0;

      for (const orderItem of orderItems) {
        const product = productMap.get(orderItem.product_id);

        if (!product) {
          throw new BadRequestException(
            `Product with ID ${orderItem.product_id} not found.`,
          );
        }

        if (product.quantity < orderItem.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ID ${product.id}.`,
          );
        }

        totalAmount += product.price * orderItem.quantity;
      }

      return this.prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            order_number: Math.floor(Math.random() * 100000),
            total_price: totalAmount,
          },
        });

        const orderItemsData = orderItems.map((item) => {
          return {
            order_id: order.id,
            product_id: item.product_id,
            quantity: item.quantity,
            price: productMap.get(item.product_id)?.price || 0,
          };
        });

        await tx.orderItem.createMany({
          data: orderItemsData,
        });

        for (const item of orderItems) {
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
