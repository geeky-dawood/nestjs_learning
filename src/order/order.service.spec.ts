import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('OrderService', () => {
  let service: OrderService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw error if items array is empty', async () => {
    await expect(service.createOrder({ items: [] } as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw error if product not found', async () => {
    const mockTx = {
      product: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    prisma.$transaction.mockImplementation(async (callback) =>
      callback(mockTx),
    );

    await expect(
      service.createOrder({
        items: [{ product_id: 1, quantity: 1 }],
      } as any),
    ).rejects.toThrow('Product not found');
  });

  it('should throw error if stock is insufficient', async () => {
    const mockTx = {
      product: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 1, price: 100, quantity: 1 }]),
      },
    };

    prisma.$transaction.mockImplementation(async (callback) =>
      callback(mockTx),
    );

    await expect(
      service.createOrder({
        items: [{ product_id: 1, quantity: 5 }],
      } as any),
    ).rejects.toThrow('Not enough stock');
  });

  it('should create order successfully', async () => {
    const mockTx = {
      product: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 1, price: 100, quantity: 10 }]),
        update: jest.fn(),
      },
      order: {
        create: jest.fn().mockResolvedValue({
          id: 1,
          order_number: 12345,
          total_price: 200,
        }),
      },
      orderItem: {
        createMany: jest.fn(),
      },
    };

    prisma.$transaction.mockImplementation(async (callback) =>
      callback(mockTx),
    );

    const result = await service.createOrder({
      items: [{ product_id: 1, quantity: 2 }],
    } as any);

    expect(result).toEqual({
      message: 'order Placed',
      data: {
        id: 1,
        order_number: 12345,
        total_price: 200,
      },
    });

    expect(mockTx.order.create).toHaveBeenCalled();
    expect(mockTx.orderItem.createMany).toHaveBeenCalled();
    expect(mockTx.product.update).toHaveBeenCalled();
  });
});
