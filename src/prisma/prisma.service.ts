import { Injectable, Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'src/generated/prisma/client';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class PrismaService extends PrismaClient {
  constructor(config: ConfigService) {
    const configs = {
      connectionString: config.get<string>('DATABASE_URL') ?? '',
    };
    const adapter = new PrismaPg(configs, {
      onConnectionError(err) {
        Logger.error('Database connection error', err);
      },
    });
    super({
      adapter,
      errorFormat: 'pretty',
      log: ['warn', 'error', 'info', { emit: 'event', level: 'query' }],
    });
  }

  async onModuleInit() {
    Logger.log('Connecting to the database...');
    await this.$connect();
    Logger.log('Database connected successfully ✅');
  }

  async onModuleDestroy() {
    Logger.log('Disconnecting from the database...');
    await this.$disconnect();
    Logger.log('Database disconnected successfully ❌');
  }
}
