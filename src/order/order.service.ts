import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BaseService } from 'src/common/database/base.service';
import { PlaceOrderDto } from 'src/dto/place_order.dto';
import { Order, Product } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductService } from 'src/product/product.service';
import { PaginationDto } from 'src/utils/pagination';

@Injectable()
export class OrderService extends BaseService<Order> {
  constructor(
    protected prisma: PrismaService,
    private readonly productService: ProductService,
  ) {
    super(prisma, prisma.order);
  }

  async createOrder(user_id: string, payload: PlaceOrderDto) {
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
            order_number: this.generateOrderNumber(),
            total_price: totalAmount,
            user_id: user_id,
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

  async getOrderByUserId(user_id: string, pagination?: PaginationDto) {
    try {
      const validateUser = await this.prisma.user.findUnique({
        where: {
          id: user_id,
        },
      });

      if (!validateUser) {
        throw new NotFoundException('Invalid User ID');
      }

      const page = pagination?.page || 1;
      const size = pagination?.limit || 10;

      const skip = (page - 1) * size;

      const [orders, total] = await this.prisma.$transaction([
        this.prisma.order.findMany({
          where: { user_id },
          skip: skip,
          take: size,
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        this.prisma.order.count({
          where: { user_id },
        }),
      ]);

      const totalPages = Math.ceil(total / size);

      return {
        data: orders,
        meta: {
          page_number: page,
          page_size: size,
          total_pages: totalPages,
        },
      };
    } catch (error) {
      console.error('Error fetching orders by user ID:', error);
      throw error;
    }
  }

  private generateOrderNumber(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomLetters = Array.from({ length: 3 })
      .map(() => letters[Math.floor(Math.random() * letters.length)])
      .join('');

    const randomNumbers = Math.floor(100000 + Math.random() * 900000);

    return `${randomLetters}${randomNumbers}`;
  }
}
