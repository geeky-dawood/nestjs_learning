import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';

@Module({
  imports: [
    ConfigModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const port = Number(configService.get<string>('SMTP_PORT_TLS'));
        const allowInvalidTls =
          configService.get<string>('SMTP_ALLOW_INVALID_TLS') === 'true';

        return {
          transport: {
            host: configService.get<string>('SMTP_SERVER'),
            port,
            secure: port === 465,
            auth: {
              user: configService.get<string>('SMTP_USER'),
              pass: configService.get<string>('SMTP_PASSWORD'),
            },
            tls: {
              rejectUnauthorized: !allowInvalidTls,
            },
          },
          defaults: {
            from: configService.get<string>('FROM'),
          },
          template: {
            dir: process.cwd() + '/templates',
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };
      },
    }),
  ],
  providers: [MailService],
  controllers: [MailController],
  exports: [MailService],
})
export class MailModule {}
