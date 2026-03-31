import {
  BadRequestException,
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { BaseService } from 'src/common/database/base.service';
import { OrderStatusDto } from 'src/dto/order_status.dto';
import { PlaceOrderDto } from 'src/dto/place_order.dto';
import { SearchDto } from 'src/dto/serach.dto';
import {
  ActivityActionType,
  Order,
  OrderStatusEnum,
  Prisma,
  Product,
} from 'src/generated/prisma/client';
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

    const validateUser = await this.prisma.user.findUnique({
      where: {
        id: user_id,
      },
    });

    if (!validateUser) {
      throw new NotFoundException('Invalid User ID');
    }

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
          is_deleted: false,
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
        for (const item of orderItems) {
          const decrementResult = await tx.product.updateMany({
            where: {
              id: item.product_id,
              quantity: { gte: item.quantity },
            },
            data: { quantity: { decrement: item.quantity } },
          });

          if (decrementResult.count !== 1) {
            throw new BadRequestException(
              `Insufficient stock for product ID ${item.product_id}.`,
            );
          }
        }

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

        await tx.activityLogs.create({
          data: {
            user_id: user_id,
            order_id: order.id,
            action_type: ActivityActionType.ORDER_CREATED,
            description: `Order ${order.order_number} has been created.`,
            previous_status: null,
            current_status: OrderStatusEnum.PENDING,
          },
        });

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

  async getAllOrders(query: SearchDto) {
    try {
      const page = query?.page || 1;
      const size = query?.limit || 10;

      const skip = (page - 1) * size;

      const where: Prisma.OrderWhereInput = {
        ...(query?.filter && {
          order_status: query.filter,
        }),

        ...(query?.search && {
          OR: [
            {
              order_number: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            {
              user: {
                email: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            },
            {
              items: {
                some: {
                  product: {
                    OR: [
                      {
                        title: {
                          contains: query.search,
                          mode: 'insensitive',
                        },
                      },
                      {
                        category: {
                          contains: query.search,
                          mode: 'insensitive',
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        }),
      };

      return this.paginateOrders({
        where: where,
        skip: skip,
        take: size,
      });
    } catch (error) {
      throw error;
    }
  }

  async getOrderByOrderId(orderId: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: {
          id: orderId,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundException('No order found against this order-id ');
      }

      return {
        message: 'Success',
        data: order,
      };
    } catch (error) {
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

      return this.paginateOrders({
        where: { user_id },
        skip: skip,
        take: size,
      });
    } catch (error) {
      console.error('Error fetching orders by user ID:', error);
      throw error;
    }
  }

  async deleteOrderByOrderId(orderId: string) {
    try {
      await this.prisma.$transaction([
        this.prisma.orderItem.deleteMany({
          where: {
            order_id: orderId,
          },
        }),

        this.prisma.order.delete({
          where: {
            id: orderId,
          },
        }),
      ]);

      return {
        message: 'Deleted Successfully',
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Invalid order-id');
      }
      throw error;
    }
  }

  async changeOrderStatus(payload: OrderStatusDto) {
    const { order_id, status } = payload;

    try {
      const order = await this.findOne({
        where: {
          id: order_id,
        },
      });

      if (!order) {
        throw new NotFoundException('Invalid order Id');
      }

      const validtransition: Record<OrderStatusEnum, OrderStatusEnum[]> = {
        [OrderStatusEnum.PENDING]: [
          OrderStatusEnum.CONFIRMED,
          OrderStatusEnum.CANCELLED,
        ],
        [OrderStatusEnum.CONFIRMED]: [
          OrderStatusEnum.CANCELLED,
          OrderStatusEnum.COMPLETED,
        ],
        [OrderStatusEnum.CANCELLED]: [],
        [OrderStatusEnum.COMPLETED]: [],
      };

      const currentStatus = order.order_status;

      if (!validtransition[currentStatus]?.includes(status)) {
        throw new NotAcceptableException(
          `Cannot transition from ${currentStatus} to ${status}`,
        );
      }

      await this.updateOrderStatus(order_id, status);

      await this.prisma.activityLogs.create({
        data: {
          user_id: order.user_id,
          order_id: order.id,
          action_type: ActivityActionType.ORDER_STATUS_UPDATED,
          description: `Order ${order.order_number} status changed from ${currentStatus} to ${status}.`,
          previous_status: currentStatus,
          current_status: status,
        },
      });

      return {
        message: this.meanfulMsgOnStatusChange(status),
      };
    } catch (error) {
      console.log(error);
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

  private async paginateOrders(options: {
    where?: Prisma.OrderWhereInput;
    skip?: number;
    take?: number;
  }) {
    const { where = {}, skip = 0, take = 10 } = options;

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip: skip,
        take: take,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
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
      this.prisma.order.count({ where }),
    ]);

    const totalPages = Math.ceil(total / take);
    const currentPage = Math.floor(skip / take) + 1;

    return {
      data: orders,
      meta: {
        current_page_number: currentPage,
        page_size: take,
        total_pages: totalPages,
        total_records: total,
      },
    };
  }

  private updateOrderStatus(orderId: string, newStatus: OrderStatusEnum) {
    switch (newStatus) {
      case OrderStatusEnum.CANCELLED:
        return this.prisma.$transaction(async (tx) => {
          const orderItems = await tx.orderItem.findMany({
            where: {
              order_id: orderId,
            },
          });

          for (const item of orderItems) {
            await tx.product.update({
              where: {
                id: item.product_id,
              },
              data: {
                quantity: {
                  increment: item.quantity,
                },
              },
            });
          }

          return tx.order.update({
            where: {
              id: orderId,
            },
            data: {
              order_status: newStatus,
            },
          });
        });

      default:
        return this.prisma.order.update({
          where: {
            id: orderId,
          },
          data: {
            order_status: newStatus,
          },
        });
    }
  }

  private meanfulMsgOnStatusChange(status: OrderStatusEnum): string {
    switch (status) {
      case OrderStatusEnum.CONFIRMED:
        return 'This order has been Confirmed';
      case OrderStatusEnum.CANCELLED:
        return 'This order has been Cancelled by our team';
      case OrderStatusEnum.COMPLETED:
        return 'This order has been Completed. Thank you for shopping with us!';
      default:
        return 'Status Updated';
    }
  }
}
