import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EmailRetryService } from '../mail/email-retry.service';

@Injectable()
export class TaskService {
  constructor(private readonly emailRetryService: EmailRetryService) {}

  private readonly logger = new Logger(TaskService.name);

  @Cron(CronExpression.EVERY_5_MINUTES, {
    timeZone: 'UTC',
  })
  async retryFailedEmails() {
    this.logger.verbose(
      'TaskService: Cron job started - retrying failed emails',
    );
    await this.emailRetryService.retryFailedEmails();
    this.logger.verbose('TaskService: Cron job completed ');
    return;
  }
}
