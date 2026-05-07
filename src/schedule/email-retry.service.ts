import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailAttemptStatus, EmailType } from '../generated/prisma/enums';
import { MailService } from '../mail/mail.service';

@Injectable()
export class EmailRetryService {
  private readonly logger = new Logger(EmailRetryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async retryFailedEmails() {
    this.logger.log('Checking failed emails...');

    const failedEmails = await this.prisma.emailActivityLogs.findMany({
      where: {
        attempt_status: EmailAttemptStatus.FAILED,
        retry_count: {
          lt: 3,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 20,
    });

    if (!failedEmails.length) {
      this.logger.log('No failed emails found');
      return;
    }

    for (const emailLog of failedEmails) {
      try {
        switch (emailLog.email_type) {
          case EmailType.ORDER_PLACED:
            this.logger.log(
              `Retrying ORDER_PLACED email for log id ${emailLog.id}`,
            );
            await this.retryOrderPlacedEmail(emailLog);
            break;

          case EmailType.ORDER_STATUS_UPDATED:
            this.logger.log(
              `Retrying ORDER_STATUS_UPDATED email for log id ${emailLog.id}`,
            );
            await this.retryOrderStatusUpdateEmail(emailLog);
            break;

          default:
            this.logger.warn(`Unhandled email type: ${emailLog.email_type}`);
        }
      } catch (error) {
        this.logger.error(`Retry failed for log id ${emailLog.id}`, error);
      }
    }
  }

  private async retryOrderPlacedEmail(emailLog: any) {
    const order = await this.prisma.order.findUnique({
      where: {
        id: emailLog.order_id,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      await this.markAsPermanentFailure(emailLog.id, 'Order not found');
      return;
    }

    const emailResponse = await this.mailService.sendOrderPlacedEmail(
      order.user_id,
      order.items,
      order.order_number,
    );

    await this.prisma.emailActivityLogs.update({
      where: {
        id: emailLog.id,
      },
      data: {
        attempt_status: emailResponse?.success
          ? EmailAttemptStatus.SUCCESS
          : EmailAttemptStatus.FAILED,

        retry_count: {
          increment: 1,
        },

        reason: emailResponse?.reason,
      },
    });

    this.logger.log(`Retry email processed for order ${order.order_number}`);
  }

  private async retryOrderStatusUpdateEmail(emailLog: any) {
    const order = await this.prisma.order.findUnique({
      where: {
        id: emailLog.order_id,
      },
      select: {
        user_id: true,
        order_status: true,
      },
    });

    if (!order) {
      await this.markAsPermanentFailure(emailLog.id, 'Order not found');
      return;
    }

    const emailResponse = await this.mailService.sendOrderStatusEmail(
      order.user_id,
      { order_id: emailLog.order_id, status: order.order_status },
    );

    await this.prisma.emailActivityLogs.update({
      where: {
        id: emailLog.id,
      },
      data: {
        attempt_status: emailResponse?.success
          ? EmailAttemptStatus.SUCCESS
          : EmailAttemptStatus.FAILED,

        retry_count: {
          increment: 1,
        },

        reason: emailResponse?.reason,
      },
    });
  }

  private async markAsPermanentFailure(logId: string, reason: string) {
    await this.prisma.emailActivityLogs.update({
      where: {
        id: logId,
      },
      data: {
        reason,
        retry_count: 3,
      },
    });
  }
}
