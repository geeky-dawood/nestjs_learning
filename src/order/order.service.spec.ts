import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductService } from 'src/product/product.service';
import {
  emptyOrderItems,
  duplicateOrderItems,
  singleItemOrder,
  multiItemOrder,
  productNotFound,
  productsInStock,
  productsInsufficientStock,
  multiProductsInStock,
} from 'src/test/order.test.data';

describe('OrderService', () => {
  let service: OrderService;
  let prisma: any;
  let productService: any;

  const userId = 'user-123';

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      user: { findUnique: jest.fn() },
      order: { findMany: jest.fn(), count: jest.fn() },
    };

    productService = { findMany: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: prisma },
        { provide: ProductService, useValue: productService },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw error if items array is empty', async () => {
    await expect(
      service.createOrder(userId, { items: emptyOrderItems }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw error if duplicate products exist', async () => {
    await expect(
      service.createOrder(userId, { items: duplicateOrderItems }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw error if product not found', async () => {
    productService.findMany.mockResolvedValue(productNotFound as any);

    await expect(
      service.createOrder(userId, { items: singleItemOrder }),
    ).rejects.toThrow('One or more products not found');
  });

  it('should throw error if stock is insufficient', async () => {
    productService.findMany.mockResolvedValue(productsInsufficientStock as any);

    await expect(
      service.createOrder(userId, { items: singleItemOrder }),
    ).rejects.toThrow(/Insufficient stock/);
  });

  it('should create single-item order successfully', async () => {
    productService.findMany.mockResolvedValue(productsInStock as any);

    const mockTx = {
      order: {
        create: jest.fn().mockResolvedValue({
          id: 'o1',
          order_number: 'ABC123',
          total_price: 200,
        }),
      },
      orderItem: { createMany: jest.fn() },
      product: { update: jest.fn() },
    };

    prisma.$transaction.mockImplementation(async (cb) => cb(mockTx));

    const result = await service.createOrder(userId, {
      items: singleItemOrder,
    });

    expect(result).toEqual({
      message: 'order Placed',
      data: { id: 'o1', order_number: 'ABC123', total_price: 200 },
    });

    expect(mockTx.order.create).toHaveBeenCalled();
    expect(mockTx.orderItem.createMany).toHaveBeenCalled();
    expect(mockTx.product.update).toHaveBeenCalled();
  });

  it('should create multi-item order successfully', async () => {
    productService.findMany.mockResolvedValue(multiProductsInStock as any);

    const mockTx = {
      order: {
        create: jest.fn().mockResolvedValue({
          id: 'o2',
          order_number: 'XYZ456',
          total_price: 800,
        }),
      },
      orderItem: { createMany: jest.fn() },
      product: { update: jest.fn() },
    };

    prisma.$transaction.mockImplementation(async (cb) => cb(mockTx));

    const result = await service.createOrder(userId, { items: multiItemOrder });

    expect(result).toEqual({
      message: 'order Placed',
      data: { id: 'o2', order_number: 'XYZ456', total_price: 800 },
    });

    expect(mockTx.order.create).toHaveBeenCalled();
    expect(mockTx.orderItem.createMany).toHaveBeenCalled();
    expect(mockTx.product.update).toHaveBeenCalled();
  });

  it('should throw NotFoundException if user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.getOrderByUserId(userId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should return paginated orders with products', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });

    prisma.order.findMany.mockResolvedValue([
      {
        id: 'o1',
        order_number: 'ABC123',
        total_price: 200,
        items: [
          {
            id: 'oi1',
            quantity: 2,
            price: 100,
            product: { id: 'p1', title: 'Product 1', price: 50 },
          },
        ],
      },
    ]);

    prisma.order.count.mockResolvedValue(1);

    const result = await service.getOrderByUserId(userId, {
      page: 1,
      limit: 10,
    });

    expect(result).toEqual({
      data: [
        {
          id: 'o1',
          order_number: 'ABC123',
          total_price: 200,
          items: [
            {
              id: 'oi1',
              quantity: 2,
              price: 100,
              product: { id: 'p1', title: 'Product 1', price: 50 },
            },
          ],
        },
      ],
      meta: { page_number: 1, page_size: 10, total_pages: 1 },
    });
  });

  it('should handle pagination correctly', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });

    const ordersMock = Array.from({ length: 15 }).map((_, i) => ({
      id: `o${i + 1}`,
      order_number: `ORD${i + 1}`,
      total_price: 100 + i,
      items: [],
    }));

    prisma.order.findMany.mockImplementation(({ skip, take }) =>
      Promise.resolve(ordersMock.slice(skip, skip + take)),
    );

    prisma.order.count.mockResolvedValue(15);

    const result = await service.getOrderByUserId(userId, {
      page: 2,
      limit: 5,
    });

    expect(result.data.length).toBe(5);
    expect(result.meta).toEqual({
      page_number: 2,
      page_size: 5,
      total_pages: 3,
    });
    expect(result.data[0].id).toBe('o6');
  });
});
