import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { PrismaService } from './prisma.service';

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn(),
}));

jest.mock('../generated/prisma/client', () => {
  class MockPrismaClient {
    static constructorOptions: unknown;

    $connect = jest.fn();
    $disconnect = jest.fn();

    constructor(options: unknown) {
      MockPrismaClient.constructorOptions = options;
    }
  }

  return { PrismaClient: MockPrismaClient };
});

describe('PrismaService', () => {
  let config: Pick<ConfigService, 'get'>;
  const mockPrismaPg = PrismaPg as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    config = {
      get: jest.fn(() => 'postgres://test-url'),
    };
  });

  it('creates PrismaPg with the configured database url', () => {
    const service = new PrismaService(config as ConfigService);

    expect(service).toBeDefined();
    expect(config.get).toHaveBeenCalledWith('DATABASE_URL');
    expect(mockPrismaPg).toHaveBeenCalledWith(
      { connectionString: 'postgres://test-url' },
      expect.objectContaining({
        onConnectionError: expect.any(Function),
      }),
    );
  });

  it('falls back to an empty connection string', () => {
    config.get = jest.fn(() => undefined);

    new PrismaService(config as ConfigService);

    expect(mockPrismaPg).toHaveBeenCalledWith(
      { connectionString: '' },
      expect.any(Object),
    );
  });

  it('logs adapter connection errors', () => {
    const errorSpy = jest.spyOn(Logger, 'error').mockImplementation(() => {});

    new PrismaService(config as ConfigService);
    const [, adapterOptions] = mockPrismaPg.mock.calls[0];
    adapterOptions.onConnectionError(new Error('connection failed'));

    expect(errorSpy).toHaveBeenCalledWith(
      'Database connection error',
      expect.any(Error),
    );
  });

  it('connects on module init', async () => {
    const logSpy = jest.spyOn(Logger, 'log').mockImplementation(() => {});
    const service = new PrismaService(config as ConfigService);

    await service.onModuleInit();

    expect(service.$connect).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('Connecting to the database...');
    expect(logSpy).toHaveBeenCalledWith('Database connected successfully ✅');
  });

  it('disconnects on module destroy', async () => {
    const logSpy = jest.spyOn(Logger, 'log').mockImplementation(() => {});
    const service = new PrismaService(config as ConfigService);

    await service.onModuleDestroy();

    expect(service.$disconnect).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('Disconnecting from the database...');
    expect(logSpy).toHaveBeenCalledWith(
      'Database disconnected successfully ❌',
    );
  });
});
