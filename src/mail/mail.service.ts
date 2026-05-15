import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../prisma/prisma.service';
import { OrderProductDto } from '../dto/place_order.dto';
import { OrderStatusDto } from '../dto/order_status.dto';
import { ConfigService } from '@nestjs/config';
import i18next from 'i18next';
import { initI18n } from '../common/i18n/i18n.config';

type MailerSendResponse = {
  accepted?: string[];
  rejected?: string[];
  pending?: string[];
  response?: string;
  messageId?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendOrderPlacedEmail(
    user_id: string,
    items: OrderProductDto[],
    order_number: string,
  ) {
    try {
      await initI18n();

      const user = await this.prismaService.user.findUnique({
        where: { id: user_id },
      });

      if (!user) {
        throw new Error(`User not found for id: ${user_id}`);
      }

      const lang = (user.preferred_language ?? 'EN').toLowerCase();

      const t = i18next.getFixedT(lang!);

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

      await this.send({
        to: user.email,

        subject: t('orderPlaced.subject'),

        template: 'order-placed-email',

        context: {
          lang,

          name: user.name,

          products: enrichedProducts,

          status: 'Placed',

          orderNumber: order_number,

          title: t('orderPlaced.title'),

          greeting: t('orderPlaced.greeting'),

          thankYouMessage: t('orderPlaced.thankYou'),

          productLabel: t('orderPlaced.product'),

          quantityLabel: t('orderPlaced.quantity'),

          orderNumberLabel: t('orderPlaced.orderNumber'),

          orderStatusLabel: t('orderPlaced.status'),

          supportMessage: t('orderPlaced.support'),
        },
      });

      return {
        success: true,
        reason: null,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send order placed email for user: ${user_id}, order: ${order_number}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    }
  }

  async sendOrderStatusEmail(user_id: string, body: OrderStatusDto) {
    try {
      await initI18n();

      const user = await this.prismaService.user.findUnique({
        where: { id: user_id },
      });

      if (!user) {
        throw new Error(`User not found for id: ${user_id}`);
      }

      const order = await this.prismaService.order.findUnique({
        where: {
          id: body.order_id,
        },
      });

      if (!order) {
        throw new Error(`Order not found for id: ${body.order_id}`);
      }

      const lang = (user.preferred_language ?? 'EN').toLowerCase();

      const t = i18next.getFixedT(lang!);

      await this.send({
        to: user.email,

        subject: t('orderStatus.subject'),

        template: 'order-status-email',

        context: {
          lang,

          name: user.name,
          status: body.status,
          orderNumber: order.order_number,

          message: null,

          // Translations
          title: t('orderStatus.title'),

          greeting: t('orderStatus.greeting'),

          statusUpdatedMessage: t('orderStatus.statusUpdatedMessage'),

          orderNumberLabel: t('orderStatus.orderNumberLabel'),

          statusLabel: t('orderStatus.statusLabel'),

          supportMessage: t('orderStatus.supportMessage'),

          footerText: t('orderStatus.footerText'),
        },
      });

      return {
        success: true,
        reason: null,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send order status email for user: ${user_id}, order: ${body.order_id}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    }
  }

  private async send(params: {
    to: string | string[];
    subject: string;
    template: string;
    context: any;
  }) {
    try {
      const response = (await this.mailerService.sendMail({
        to: params.to,
        from: this.configService.get<string>('FROM'),
        subject: params.subject,
        template: params.template,
        context: params.context,
      })) as MailerSendResponse;

      if (response?.rejected?.length) {
        throw new Error(
          `SMTP rejected recipient(s): ${response.rejected.join(', ')}`,
        );
      }

      if (response?.pending?.length) {
        this.logger.warn(
          `Email pending for ${response.pending.join(', ')}. SMTP response: ${
            response.response ?? 'No response provided'
          }`,
        );
      }

      this.logger.log(
        `Email accepted by SMTP server for delivery to ${params.to}`,
      );
      return response;
    } catch (error) {
      this.logger.error(`Email failed for ${params.to}`, error);
      throw error;
    }
  }
}
