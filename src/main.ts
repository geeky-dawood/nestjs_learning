import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initI18n } from './common/i18n/i18n.config';
import { AllExceptionsFilter } from './stripe/exceptions/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,

    logger: ['log', 'warn', 'error', 'debug'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT')!;

  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors();

  await initI18n();
  await app.listen(port);
}
bootstrap();
