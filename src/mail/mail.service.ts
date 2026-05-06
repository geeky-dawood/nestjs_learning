import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../prisma/prisma.service';
import { OrderProductDto } from '../dto/place_order.dto';
import { OrderStatusDto } from '../dto/order_status.dto';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly mailerService: MailerService,
  ) {}

  async sendOrderPlacedEmail(
    userId: string,
    items: OrderProductDto[],
    orderNumber: string,
  ) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!user) {
        throw new Error(`User not found for id: ${userId}`);
      }
      const productIds = items.map((i) => i.product_id);

      const products = await this.prismaService.product.findMany({
        where: {
          id: {
            in: productIds,
          },
        },
      });

      const enrichedProducts = products.map((p) => {
        const item = items.find((i) => i.product_id === p.id);

        return {
          id: p.id,
          name: p.title,
          price: p.price,
          quantity: item?.quantity ?? 1,
        };
      });

      return await this.send({
        to: user.email,
        subject: 'Order Confirmation',
        template: 'order-placed-email',
        context: {
          name: user.name,
          products: enrichedProducts,
          status: 'Placed',
          orderNumber: orderNumber,
        },
      });
    } catch (error) {
      console.log(error);
    }
  }

  async sendOrderStatusEmail(userId: string, body: OrderStatusDto) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!user) {
        throw new Error(`User not found for id: ${userId}`);
      }

      const order = await this.prismaService.order.findUnique({
        where: {
          id: body.order_id,
        },
      });

      if (!order) {
        throw new Error(`Order not found for id: ${body.order_id}`);
      }

      return await this.send({
        to: user.email,
        subject: `Order ${body.status}`,
        template: 'order-status-email',
        context: {
          name: user.name,
          status: body.status,
          orderNumber: order.order_number,
        },
      });
    } catch (error) {
      console.log(error);
    }
  }

  private async send(params: {
    to: string | string[];
    subject: string;
    template: string;
    context: any;
  }) {
    try {
      const response = await this.mailerService.sendMail({
        to: params.to,
        from: process.env.FROM,
        subject: params.subject,
        template: params.template,
        context: params.context,
      });

      this.logger.log(`Email sent to ${params.to}`);
      return response;
    } catch (error) {
      this.logger.error(`Email failed for ${params.to}`, error);
      throw error;
    }
  }
}
