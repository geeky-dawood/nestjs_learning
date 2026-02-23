import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  duplicateOrderItems,
  emptyOrderItems,
  singleItemOrder,
  productNotFound,
  productsInStock,
  productsInsufficientStock,
} from 'src/test/order.test.data';

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
    await expect(
      service.createOrder({ items: emptyOrderItems }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw error if duplicate products exist', async () => {
    await expect(
      service.createOrder({ items: duplicateOrderItems }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw error if product not found', async () => {
    jest.spyOn(service, 'findMany').mockResolvedValue(productNotFound as any);

    await expect(
      service.createOrder({ items: singleItemOrder }),
    ).rejects.toThrow('One or more products not found');
  });

  it('should throw error if stock is insufficient', async () => {
    jest
      .spyOn(service, 'findMany')
      .mockResolvedValue(productsInsufficientStock as any);

    await expect(
      service.createOrder({ items: singleItemOrder }),
    ).rejects.toThrow('Insufficient stock for product ID 1');
  });

  it('should create order successfully', async () => {
    jest.spyOn(service, 'findMany').mockResolvedValue(productsInStock as any);

    const mockTx = {
      order: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'o1', order_number: 123, total_price: 200 }),
      },
      orderItem: { createMany: jest.fn() },
      product: { update: jest.fn() },
    };

    prisma.$transaction.mockImplementation(async (cb) => cb(mockTx));

    const result = await service.createOrder({ items: singleItemOrder });

    expect(result).toEqual({
      message: 'order Placed',
      data: { id: 'o1', order_number: 123, total_price: 200 },
    });

    expect(mockTx.order.create).toHaveBeenCalled();
    expect(mockTx.orderItem.createMany).toHaveBeenCalled();
    expect(mockTx.product.update).toHaveBeenCalled();
  });
});
